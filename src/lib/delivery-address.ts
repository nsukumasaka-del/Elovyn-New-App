export type DeliveryAddress = {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

const requiredFields: Array<[keyof DeliveryAddress, string, number]> = [
  ["recipientName", "Recipient name", 100],
  ["phone", "Phone number", 30],
  ["addressLine1", "Street address", 160],
  ["suburb", "Suburb", 100],
  ["city", "City or town", 100],
  ["province", "Province or state", 100],
  ["postalCode", "Postal code", 20],
  ["country", "Country", 100],
];

export function normalizeDeliveryAddress(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false as const, error: "Enter a delivery address before checkout." };
  }
  const record = input as Record<string, unknown>;
  const address = {} as DeliveryAddress;
  for (const [key, label, maxLength] of requiredFields) {
    const value = record[key];
    if (typeof value !== "string" || !value.trim()) return { ok: false as const, error: `${label} is required.` };
    if (value.trim().length > maxLength) return { ok: false as const, error: `${label} must be no longer than ${maxLength} characters.` };
    address[key] = value.trim();
  }
  const addressLine2 = record.addressLine2;
  if (addressLine2 !== undefined && typeof addressLine2 !== "string") return { ok: false as const, error: "Apartment or unit must be text." };
  if (typeof addressLine2 === "string" && addressLine2.trim().length > 100) return { ok: false as const, error: "Apartment or unit must be no longer than 100 characters." };
  address.addressLine2 = typeof addressLine2 === "string" ? addressLine2.trim() : "";
  if (!/^[+0-9() .-]{7,30}$/.test(address.phone)) return { ok: false as const, error: "Enter a valid delivery phone number." };
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/.test(address.postalCode)) return { ok: false as const, error: "Enter a valid postal code." };
  return { ok: true as const, address };
}
