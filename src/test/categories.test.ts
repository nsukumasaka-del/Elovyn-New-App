import { describe, expect, it } from "vitest";
import { productMatchesCategory } from "@/lib/categories";

describe("product category matching", () => {
  it("matches simple category names to their storefront slugs", () => {
    expect(productMatchesCategory("t-shirts", "T-Shirts")).toBe(true);
    expect(productMatchesCategory("hoodies", "Hoodies")).toBe(true);
  });

  it("matches a category nested in a supplier category path", () => {
    expect(productMatchesCategory("hoodies", "Apparel / Hoodies")).toBe(true);
    expect(productMatchesCategory("t-shirts", "Clothing > T-Shirts")).toBe(true);
    expect(productMatchesCategory("hoodies", "Apparel / T-Shirts")).toBe(false);
  });
});
