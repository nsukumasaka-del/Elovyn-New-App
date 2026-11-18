import { describe, expect, it } from "vitest";
import { supplierOrdersToCsv } from "@/lib/supplier-csv";

const orders = [{
  orderNumber: "ELV-1001",
  customerName: "A, Customer",
  phone: "+27821234567",
  addressLine1: '12 "Main" Street',
  addressLine2: "Unit 4",
  suburb: "Central",
  city: "Cape Town",
  province: "Western Cape",
  postalCode: "8001",
  items: [{ supplierSku: "CJ-VID-1", quantity: 2 }],
}];

describe("supplier order CSV", () => {
  it("exports the Eprolo template with UTF-8 BOM and escaped cells", () => {
    const csv = supplierOrdersToCsv("eprolo", orders);
    expect(csv.startsWith("\uFEFFOrder Number,Product SKU,Quantity")).toBe(true);
    expect(csv).toContain('"A, Customer"');
    expect(csv).toContain('"12 ""Main"" Street"');
    expect(csv).toContain("South Africa");
  });

  it("exports the CJ template and ZA country code", () => {
    const csv = supplierOrdersToCsv("cj", orders);
    expect(csv.startsWith("\uFEFFOrder Number,SKU,Quantity,Consignee")).toBe(true);
    expect(csv).toContain(",8001,ZA\r\n");
  });
});
