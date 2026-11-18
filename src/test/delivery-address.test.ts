import { describe, expect, it } from "vitest";
import { normalizeDeliveryAddress, normalizeSouthAfricanMobilePhone } from "@/lib/delivery-address";

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
    expect(normalizeDeliveryAddress({ ...validAddress, city: " Johannesburg " })).toEqual({
      ok: true,
      address: { ...validAddress, phone: "+27821234567" },
    });
  });

  it("requires every delivery location field", () => {
    expect(normalizeDeliveryAddress({ ...validAddress, addressLine1: "" })).toEqual({ ok: false, error: "Street address is required." });
    expect(normalizeDeliveryAddress(undefined)).toEqual({ ok: false, error: "Enter a delivery address before checkout." });
  });

  it("rejects invalid phone and postal values", () => {
    expect(normalizeDeliveryAddress({ ...validAddress, phone: "abc" })).toEqual({
      ok: false,
      error: "Enter a valid South African mobile number, such as 072 123 4567 or +27 72 123 4567.",
    });
    expect(normalizeDeliveryAddress({ ...validAddress, postalCode: "!" })).toEqual({
      ok: false,
      error: "Postal code must be exactly 4 digits.",
    });
  });

  it("normalizes South African mobile numbers and enforces a four-digit postal code", () => {
    expect(normalizeSouthAfricanMobilePhone("0721234567")).toBe("+27721234567");
    expect(normalizeSouthAfricanMobilePhone("082 123 4567")).toBe("+27821234567");
    expect(normalizeSouthAfricanMobilePhone("+27721234567")).toBe("+27721234567");
    expect(normalizeSouthAfricanMobilePhone("011 123 4567")).toBeNull();
    expect(normalizeDeliveryAddress({ ...validAddress, phone: "0721234567" })).toMatchObject({
      ok: true,
      address: { phone: "+27721234567" },
    });
    expect(normalizeDeliveryAddress({ ...validAddress, postalCode: "200" })).toEqual({
      ok: false,
      error: "Postal code must be exactly 4 digits.",
    });
  });
});
