import { describe, expect, it } from "vitest";
import { calculateOrderNetProfit, calculateRecommendedRetailPrice } from "@/lib/pricing";

describe("pricing estimates", () => {
  it("does not calculate prices until an exchange rate is configured", () => {
    expect(calculateRecommendedRetailPrice(10, 30, { usdToZarRate: null, feeBufferPercent: 10 })).toBeNull();
  });

  it("accounts for markup, Yoco, FX, VAT, and the fee buffer", () => {
    const estimate = calculateRecommendedRetailPrice(10, 30, { usdToZarRate: 18, feeBufferPercent: 10 });
    expect(estimate).not.toBeNull();
    expect(estimate!.baseCostZar).toBe(180);
    expect(estimate!.recommendedPriceZar).toBeGreaterThan(234);
    expect(calculateOrderNetProfit(estimate!.recommendedPriceZar, 10, { usdToZarRate: 18, feeBufferPercent: 10 }))
      .toBeCloseTo(54, 0);
  });

  it("reports net profit as unavailable when a line item has no supplier cost", () => {
    expect(calculateOrderNetProfit(500, null, { usdToZarRate: 18, feeBufferPercent: 10 })).toBeNull();
  });
});
