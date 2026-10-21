import { describe, expect, it } from "vitest";
import { normalizeDeliveryAddress } from "@/lib/delivery-address";

const validAddress = {
  recipientName: "Lerato Nkosi",
  phone: "+27 82 123 4567",
  addressLine1: "12 Market Street",
  addressLine2: "Unit 4",
  suburb: "Braamfontein",
  city: "Johannesburg",
  province: "Gauteng",
  postalCode: "2001",
  country: "South Africa",
};

describe("delivery address validation", () => {
  it("normalizes a complete delivery address", () => {
    expect(normalizeDeliveryAddress({ ...validAddress, city: " Johannesburg " })).toEqual({ ok: true, address: validAddress });
  });

  it("requires every delivery location field", () => {
    expect(normalizeDeliveryAddress({ ...validAddress, addressLine1: "" })).toEqual({ ok: false, error: "Street address is required." });
    expect(normalizeDeliveryAddress(undefined)).toEqual({ ok: false, error: "Enter a delivery address before checkout." });
  });

  it("rejects invalid phone and postal values", () => {
    expect(normalizeDeliveryAddress({ ...validAddress, phone: "abc" })).toEqual({ ok: false, error: "Enter a valid delivery phone number." });
    expect(normalizeDeliveryAddress({ ...validAddress, postalCode: "!" })).toEqual({ ok: false, error: "Enter a valid postal code." });
  });
});
