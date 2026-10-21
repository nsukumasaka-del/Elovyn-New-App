import { describe, expect, it } from "vitest";
import { buildImportProducts, parseCsv, suggestedMapping } from "@/lib/product-import";

describe("product import mapping", () => {
  it("parses BOM-prefixed CSV and groups variant rows into one product", () => {
    const csv = '\uFEFFProduct Name,Product SKU,Price,Category,Variant SKU,Variant Price,Variant Stock,Option 1 Name,Option 1 Value\r\n"Box Tee",TEE-1,499,Streetwear,TEE-1-S,499,8,Size,S\r\n"Box Tee",TEE-1,499,Streetwear,TEE-1-M,529,4,Size,M';
    const parsed = parseCsv(csv);
    const products = buildImportProducts(parsed.rows, suggestedMapping(parsed.headers));
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ title: "Box Tee", sku: "TEE-1", category: "Streetwear" });
    expect(products[0].options).toEqual([{ name: "Size", values: ["S", "M"] }]);
    expect(products[0].variants).toHaveLength(2);
    expect(products[0].variants?.[0]).toMatchObject({ sku: "TEE-1-S", inventory_quantity: 8, option_values: { Size: "S" } });
  });

  it("rejects imports without required mappings", () => {
    const mapping = suggestedMapping(["name"]);
    expect(() => buildImportProducts([{ name: "Missing identifiers" }], mapping)).toThrow("Product SKU must be mapped");
  });
});
