export const DEFAULT_FEE_BUFFER_PERCENT = 10;
export const YOCO_CARD_FEE_PERCENT = 2.95;
export const YOCO_FEE_VAT_PERCENT = 15;
export const FX_CONVERSION_FEE_PERCENT = 3;

export type PricingSettings = {
  usdToZarRate: number | null;
  feeBufferPercent: number;
};

export type ProductPriceEstimate = {
  baseCostZar: number;
  yocoFeeZar: number;
  fxFeeZar: number;
  safetyBufferZar: number;
  recommendedPriceZar: number;
};

function isValidRate(rate: number | null): rate is number {
  return rate !== null && Number.isFinite(rate) && rate > 0;
}

export function calculateRecommendedRetailPrice(
  costPriceUsd: number,
  targetMarkupPercent: number,
  settings: PricingSettings,
): ProductPriceEstimate | null {
  if (
    !isValidRate(settings.usdToZarRate)
    || !Number.isFinite(costPriceUsd) || costPriceUsd < 0
    || !Number.isFinite(targetMarkupPercent) || targetMarkupPercent < 0
    || !Number.isFinite(settings.feeBufferPercent) || settings.feeBufferPercent < 0
  ) return null;

  const baseCostZar = costPriceUsd * settings.usdToZarRate;
  const yocoRate = YOCO_CARD_FEE_PERCENT / 100 * (1 + YOCO_FEE_VAT_PERCENT / 100);
  const fxRate = FX_CONVERSION_FEE_PERCENT / 100;
  const bufferMultiplier = 1 + settings.feeBufferPercent / 100;
  const recommendedPriceZar = Math.ceil((
    (baseCostZar * (1 + targetMarkupPercent / 100) + baseCostZar * fxRate * bufferMultiplier)
    / (1 - yocoRate * bufferMultiplier)
  ) * 100) / 100;
  const yocoFeeZar = recommendedPriceZar * yocoRate;
  const fxFeeZar = baseCostZar * fxRate;
  const safetyBufferZar = (yocoFeeZar + fxFeeZar) * (settings.feeBufferPercent / 100);

  return {
    baseCostZar,
    yocoFeeZar,
    fxFeeZar,
    safetyBufferZar,
    recommendedPriceZar,
  };
}

export function calculateOrderNetProfit(
  revenueZar: number,
  totalCostUsd: number | null,
  settings: PricingSettings,
): number | null {
  if (
    !isValidRate(settings.usdToZarRate)
    || totalCostUsd === null || !Number.isFinite(totalCostUsd) || totalCostUsd < 0
    || !Number.isFinite(revenueZar) || revenueZar < 0
    || !Number.isFinite(settings.feeBufferPercent) || settings.feeBufferPercent < 0
  ) return null;

  const baseCostZar = totalCostUsd * settings.usdToZarRate;
  const yocoFeeZar = revenueZar * YOCO_CARD_FEE_PERCENT / 100 * (1 + YOCO_FEE_VAT_PERCENT / 100);
  const fxFeeZar = baseCostZar * FX_CONVERSION_FEE_PERCENT / 100;
  const safetyBufferZar = (yocoFeeZar + fxFeeZar) * settings.feeBufferPercent / 100;
  return revenueZar - baseCostZar - yocoFeeZar - fxFeeZar - safetyBufferZar;
}
