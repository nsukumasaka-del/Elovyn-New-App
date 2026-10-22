export const STANDARD_SHIPPING_FEE_CENTS = 9_900;

export function calculateCheckoutAmounts(items: Array<{ price: number; quantity: number }>) {
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
  return {
    subtotalCents,
    shippingCents: STANDARD_SHIPPING_FEE_CENTS,
    totalCents: subtotalCents + STANDARD_SHIPPING_FEE_CENTS,
  };
}
