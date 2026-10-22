import { describe, expect, it } from "vitest";
import {
  configuredSupplierRecords,
  configuredSupplierRequest,
  eproloProductListRequest,
  eproloSignature,
  md5,
  normalizeEproloProducts,
  parseSupplierConfiguration,
  pathValue,
} from "@/lib/supplier-engine";

describe("universal supplier engine", () => {
  it("extracts dot paths and array indexes", () => {
    const payload = { result: { groups: [{ items: [{ product_name: "Shirt" }] }] } };
    expect(pathValue(payload, "result.groups[0].items.0.product_name")).toBe("Shirt");
  });

  it("supports legacy flat field mappings", () => {
    const configuration = parseSupplierConfiguration(JSON.stringify({ title: "product_name", price: "sale_price" }));
    expect(configuration).toMatchObject({ productsPath: "products", fields: { title: "product_name", price: "sale_price" }, request: { method: "GET" } });
  });

  it("builds a configured POST request with encrypted credential placeholders", () => {
    const configuration = parseSupplierConfiguration(JSON.stringify({
      products_path: "result.items",
      request: {
        method: "POST",
        headers: { "X-Api-Key": "{{api_key}}", "X-Api-Secret": "{{api_secret}}" },
        query: { page: 2, cursor: "{{timestamp}}" },
        body: { token: "{{api_key}}", limit: 50 },
      },
      fields: { title: "product_name", price: "sale_price" },
    }));
    const request = configuredSupplierRequest(new URL("https://supplier.example/products"), configuration, { apiKey: "key-123", apiSecret: "secret-456" }, "1720000000000");
    expect(request.url.toString()).toBe("https://supplier.example/products?page=2&cursor=1720000000000");
    expect(request.init).toMatchObject({ method: "POST", headers: { "X-Api-Key": "key-123", "X-Api-Secret": "secret-456", "Content-Type": "application/json" } });
    expect(JSON.parse(String(request.init.body))).toEqual({ token: "key-123", limit: 50 });
    expect(configuredSupplierRecords({ result: { items: [{ id: "one" }] } }, configuration)).toEqual([{ id: "one" }]);
  });

  it("rejects unsupported request methods and dangerous headers", () => {
    expect(() => parseSupplierConfiguration('{"request":{"method":"DELETE"}}')).toThrow("GET, POST, or PUT");
    const configuration = parseSupplierConfiguration('{"request":{"headers":{"Host":"internal.example"}}}');
    expect(() => configuredSupplierRequest(new URL("https://supplier.example/products"), configuration, { apiKey: "", apiSecret: "" })).toThrow("not allowed");
  });
});

describe("EPROLO integration", () => {
  it("produces the documented MD5 signature", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(md5("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(eproloSignature("TEST_8888888_Key", "1720000000000", "TEST_8888888_Secret")).toBe("b05dda2863f935b6cf67c0af0dc30164");
  });

  it("builds the documented EPROLO catalog request", () => {
    const request = eproloProductListRequest(
      new URL("https://openapi.eprolo.com/product_list.html?status=1"),
      { apiKey: "TEST_8888888_Key", apiSecret: "TEST_8888888_Secret" },
      "1720000000000",
    );

    expect(request.url.toString()).toBe("https://openapi.eprolo.com/eprolo_product_list.html?page=1&timestamp=1720000000000&sign=b05dda2863f935b6cf67c0af0dc30164");
    expect(request.init).toMatchObject({
      method: "GET",
      headers: { Accept: "application/json", "Content-Type": "application/json", apiKey: "TEST_8888888_Key" },
    });
  });

  it("normalizes EPROLO products, variants, options, stock, and images", () => {
    const products = normalizeEproloProducts({ code: "0", msg: "success", data: [{
      id: "ep-1",
      title: "EPROLO Hoodie",
      body_html: "<p>Warm hoodie</p>",
      imagefirst: "//cdn.example/main.jpg",
      wareTypeId: ",Clothing,",
      wareTypeTwoId: ",Hoodies,",
      optionlist: [{ name: "Size", position: 2 }, { name: "Color", position: 1 }],
      imagelist: [{ id: "img-black", src: "http://cdn.example/black.jpg" }, { id: "img-white", src: "https://cdn.example/white.jpg" }],
      variantlist: [
        { sku: "EP-BLK-S", cost: "12.50", inventory_quantity: 4, option1: "Black", option2: "S", imagesid: "img-black" },
        { sku: "EP-WHT-M", cost: "13.25", inventory_quantity: 6, option1: "White", option2: "M", imagesid: "img-white" },
      ],
    }] });

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      externalId: "ep-1",
      product: {
        title: "EPROLO Hoodie",
        description: "<p>Warm hoodie</p>",
        sku: "EPROLO-ep-1",
        price: 12.5,
        stock_quantity: 10,
        category: "Hoodies",
        image_url: "https://cdn.example/main.jpg",
      },
    });
    expect(products[0].product.options).toEqual([{ name: "Color", values: ["Black", "White"] }, { name: "Size", values: ["S", "M"] }]);
    expect(products[0].product.variants[0]).toMatchObject({ sku: "EPROLO-ep-1-EP-BLK-S", price: 12.5, inventory_quantity: 4, option_values: { Color: "Black", Size: "S" }, image_url: "https://cdn.example/black.jpg" });
    expect(products[0].product.images).toEqual(["https://cdn.example/main.jpg", "https://cdn.example/black.jpg", "https://cdn.example/white.jpg"]);
  });
});
