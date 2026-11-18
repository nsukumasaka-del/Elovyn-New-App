export type SupplierExportType = "eprolo" | "cj";

export type SupplierExportOrder = {
  orderNumber: string;
  customerName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  items: Array<{ supplierSku: string; quantity: number }>;
};

const supplierHeaders: Record<SupplierExportType, string[]> = {
  eprolo: [
    "Order Number", "Product SKU", "Quantity", "Customer Name", "Phone",
    "Address 1", "Address 2", "City", "Province/State", "Postal Code", "Country",
  ],
  cj: [
    "Order Number", "SKU", "Quantity", "Consignee", "Phone",
    "Address1", "Address2", "City", "Province", "Zip", "Country",
  ],
};

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function supplierOrdersToCsv(supplier: SupplierExportType, orders: SupplierExportOrder[]) {
  const rows: Array<Array<string | number>> = [supplierHeaders[supplier]];
  for (const order of orders) {
    for (const item of order.items) {
      const address2 = [order.addressLine2, order.suburb].filter(Boolean).join(", ");
      rows.push(supplier === "eprolo"
        ? [
          order.orderNumber, item.supplierSku, item.quantity, order.customerName, order.phone,
          order.addressLine1, address2, order.city, order.province, order.postalCode, "South Africa",
        ]
        : [
          order.orderNumber, item.supplierSku, item.quantity, order.customerName, order.phone,
          order.addressLine1, address2, order.city, order.province, order.postalCode, "ZA",
        ]);
    }
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
