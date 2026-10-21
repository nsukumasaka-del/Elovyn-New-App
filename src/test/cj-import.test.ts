import { describe, expect, it } from "vitest";
import { cjImportProductFromDetail } from "@/lib/cj-import";

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
});
