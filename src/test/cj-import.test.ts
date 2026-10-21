import { describe, expect, it } from "vitest";
import { cjCategoriesFromPayload, cjImportProductFromDetail, cjSearchResultsFromPayload } from "@/lib/cj-import";

describe("CJ importer normalization", () => {
  it("maps CJ product details, variants, options, images, and inventory", () => {
    const product = cjImportProductFromDetail(
      { id: "p1", nameEn: "CJ Tee", sku: "CJ-TEE", sellPrice: "9.50", bigImage: "https://example.com/main.jpg", threeCategoryName: "T-Shirts", warehouseInventoryNum: 99 },
      { data: {
        id: "p1", nameen: "CJ Tee", sku: "CJ-TEE", sellprice: "9.50", variantkeyen: "color-size", newImgList: ["https://example.com/extra.jpg"],
        stanProducts: [
          { id: "v1", sku: "CJ-TEE-BLK-S", sellprice: "10.25", variantkey: "Black-S", img: "https://example.com/black.jpg" },
          { id: "v2", sku: "CJ-TEE-WHT-M", sellprice: "11", variantkey: "White-M" },
        ],
        variantInventory: [
          { vid: "v1", inventory: [{ totalInventory: 4 }, { totalInventory: 3 }] },
          { vid: "v2", inventory: [{ totalInventory: 2 }] },
        ],
      } },
    );
    expect(product).toMatchObject({ title: "CJ Tee", sku: "CJ-TEE", stock_quantity: 9, category: "T-Shirts" });
    expect(product.images).toEqual(["https://example.com/main.jpg", "https://example.com/extra.jpg", "https://example.com/black.jpg"]);
    expect(product.options).toEqual([{ name: "Color", values: ["Black", "White"] }, { name: "Size", values: ["S", "M"] }]);
    expect(product.variants[0]).toMatchObject({ sku: "CJ-TEE-BLK-S", price: 10.25, inventory_quantity: 7, option_values: { Color: "Black", Size: "S" } });
  });

  it("preserves variants from CJ's standard product query response", () => {
    const product = cjImportProductFromDetail({}, { data: {
      pid: "p2", productNameEn: "Classic Hoodie", productSku: "CJ-HOOD", sellPrice: 18.5,
      bigImage: "https://example.com/hoodie.jpg", productImageSet: ["https://example.com/back.jpg"],
      productKeyEn: "Color-Size", categoryName: "Apparel / Hoodies",
      variants: [
        { vid: "v1", variantSku: "CJ-HOOD-BLK-S", variantSellPrice: 19.5, variantKey: "Black-S", variantImage: "https://example.com/black.jpg", barcode: "111", inventories: [{ totalInventory: 5 }, { totalInventory: 2 }] },
        { vid: "v2", variantSku: "CJ-HOOD-WHT-M", variantSellPrice: 20, variantKey: "White-M", inventories: [{ totalInventory: 3 }] },
      ],
    } });
    expect(product).toMatchObject({ title: "Classic Hoodie", sku: "CJ-HOOD", stock_quantity: 10, category: "Apparel / Hoodies" });
    expect(product.options).toEqual([{ name: "Color", values: ["Black", "White"] }, { name: "Size", values: ["S", "M"] }]);
    expect(product.variants).toHaveLength(2);
    expect(product.variants[0]).toMatchObject({ sku: "CJ-HOOD-BLK-S", price: 19.5, inventory_quantity: 7, barcode: "111", image_url: "https://example.com/black.jpg" });
    expect(product.images).toContain("https://example.com/black.jpg");
  });

  it("maps searchable CJ list results", () => {
    expect(cjSearchResultsFromPayload({ data: { content: [{ productList: [{ id: "p1", sku: "CJ-HOOD", nameEn: "Everyday Hoodie", bigImage: "https://example.com/hoodie.jpg", sellPrice: "12.50", threeCategoryName: "Hoodies" }] }] } })).toEqual([
      { id: "p1", sku: "CJ-HOOD", title: "Everyday Hoodie", image_url: "https://example.com/hoodie.jpg", price: 12.5, category: "Hoodies", currency: "USD" },
    ]);
  });

  it("flattens CJ's category tree for a dropdown", () => {
    expect(cjCategoriesFromPayload({ data: [{ categoryFirstName: "Clothing", categoryFirstList: [{ categorySecondName: "Tops", categorySecondList: [{ categoryId: "hood", categoryName: "Hoodies" }] }] }] })).toEqual([
      { id: "hood", name: "Hoodies", group: "Clothing / Tops" },
    ]);
  });
});
