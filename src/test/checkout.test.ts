import { describe, expect, it } from "vitest";
import { calculateCheckoutAmounts, DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS, STANDARD_SHIPPING_FEE_CENTS } from "@/lib/checkout";

describe("checkout totals", () => {
  it("adds the flat delivery fee to the item subtotal", () => {
    expect(STANDARD_SHIPPING_FEE_CENTS).toBe(9_900);
    expect(calculateCheckoutAmounts([
      { price: 149.99, quantity: 2 },
      { price: 50, quantity: 1 },
    ])).toEqual({ subtotalCents: 34_998, shippingCents: 9_900, totalCents: 44_898 });
  });

  it("rounds each unit price to cents before multiplying quantities", () => {
    expect(calculateCheckoutAmounts([{ price: 10.005, quantity: 3 }]).subtotalCents).toBe(3_003);
  });

  it("waives delivery at the configured free-shipping threshold", () => {
    expect(DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS).toBe(150_000);
    expect(calculateCheckoutAmounts([{ price: 750, quantity: 2 }])).toEqual({
      subtotalCents: 150_000,
      shippingCents: 0,
      totalCents: 150_000,
    });
  });

  it("applies the free-shipping threshold supplied by store settings", () => {
    expect(calculateCheckoutAmounts([{ price: 1000, quantity: 1 }], 100_000).shippingCents).toBe(0);
  });
});
