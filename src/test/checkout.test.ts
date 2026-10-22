import { describe, expect, it } from "vitest";
import { calculateCheckoutAmounts, STANDARD_SHIPPING_FEE_CENTS } from "@/lib/checkout";

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
});
