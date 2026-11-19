export const STANDARD_SHIPPING_FEE_CENTS = 9_900;
export const DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS = 150_000;

export function calculateCheckoutAmounts(
  items: Array<{ price: number; quantity: number }>,
  freeShippingThresholdCents = DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS,
) {
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
  const shippingCents = subtotalCents >= freeShippingThresholdCents ? 0 : STANDARD_SHIPPING_FEE_CENTS;
  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}
