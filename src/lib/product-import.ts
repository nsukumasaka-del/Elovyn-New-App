export const importFieldDefinitions = [
  ["title", "Title"], ["sku", "Product SKU"], ["price", "Price"], ["compare_at_price", "Compare-at price"],
  ["description", "Description / features"], ["category", "Category"], ["brand", "Brand"],
  ["stock_quantity", "Inventory quantity"], ["image_url", "Main image URL"], ["images", "Images (JSON)"],
  ["handle", "Product handle"], ["options", "Options (JSON)"], ["variants", "Variants (JSON)"],
  ["variant_sku", "Variant SKU"], ["variant_price", "Variant price"], ["variant_compare_at_price", "Variant compare-at price"],
  ["variant_stock", "Variant inventory"], ["variant_barcode", "Variant barcode"], ["variant_image_url", "Variant image URL"],
  ["option1_name", "Option 1 name"], ["option1_value", "Option 1 value"], ["option2_name", "Option 2 name"],
  ["option2_value", "Option 2 value"], ["option3_name", "Option 3 name"], ["option3_value", "Option 3 value"],
] as const;

export type ImportField = typeof importFieldDefinitions[number][0];
export type ImportMapping = Record<ImportField, string>;

const aliases: Record<ImportField, string[]> = {
  title: ["title", "name", "product_name"], sku: ["sku", "product_sku", "spu"], price: ["price", "product_price", "sell_price"],
  compare_at_price: ["compare_at_price", "compare_price", "msrp", "retail_price"], description: ["description", "body", "details"],
  category: ["category", "collection", "product_type"], brand: ["brand", "vendor"], stock_quantity: ["stock_quantity", "stock", "quantity", "inventory_quantity"],
  image_url: ["image_url", "image", "main_image"], images: ["images", "image_urls"], handle: ["handle", "slug"], options: ["options"], variants: ["variants"],
  variant_sku: ["variant_sku"], variant_price: ["variant_price"], variant_compare_at_price: ["variant_compare_at_price"],
  variant_stock: ["variant_stock", "variant_inventory", "variant_quantity"], variant_barcode: ["variant_barcode", "barcode"], variant_image_url: ["variant_image_url"],
  option1_name: ["option1_name", "option_1_name"], option1_value: ["option1_value", "option_1_value"], option2_name: ["option2_name", "option_2_name"],
  option2_value: ["option2_value", "option_2_value"], option3_name: ["option3_name", "option_3_name"], option3_value: ["option3_value", "option_3_value"],
};

export function suggestedMapping(headers: string[]): ImportMapping {
  const normalized = new Map(headers.map((header) => [header.trim().toLowerCase().replace(/[\s-]+/g, "_"), header]));
  return Object.fromEntries(importFieldDefinitions.map(([key]) => [key, aliases[key].map((alias) => normalized.get(alias)).find(Boolean) ?? ""])) as ImportMapping;
}

export function parseCsv(text: string) {
  const normalizedText = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < normalizedText.length; index += 1) {
    const character = normalizedText[index];
    if (character === '"' && quoted && normalizedText[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && normalizedText[index + 1] === "\n") index += 1;
      row.push(cell); if (row.some((entry) => entry.trim())) rows.push(row); row = []; cell = "";
    } else cell += character;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted field.");
  row.push(cell); if (row.some((entry) => entry.trim())) rows.push(row);
  if (!rows.length) throw new Error("The selected file is empty.");
  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new Error("CSV headers must be non-empty and unique.");
  const records = rows.slice(1).map((values, rowIndex) => {
    if (values.length > headers.length) throw new Error(`CSV row ${rowIndex + 2} has more values than the header row.`);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
  });
  if (!records.length) throw new Error("The CSV contains headers but no product rows.");
  return { headers, rows: records };
}

function valueAt(record: Record<string, unknown>, mapping: ImportMapping, field: ImportField) {
  const source = mapping[field];
  return source ? record[source] : undefined;
}

function optionalNumber(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(typeof value === "string" ? value.replace(/[^0-9.-]/g, "") : value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be a non-negative number.`);
  return number;
}

function jsonValue(value: unknown, label: string) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { throw new Error(`${label} must contain valid JSON.`); }
}

export function buildImportProducts(records: Record<string, unknown>[], mapping: ImportMapping) {
  for (const required of ["title", "sku", "price"] as const) if (!mapping[required]) throw new Error(`${required === "sku" ? "Product SKU" : required[0].toUpperCase() + required.slice(1)} must be mapped.`);
  const products = new Map<string, Record<string, unknown> & { variants?: Record<string, unknown>[] }>();
  const optionValues = new Map<string, Map<string, Set<string>>>();
  for (const [rowIndex, record] of records.entries()) {
    const sku = String(valueAt(record, mapping, "sku") ?? "").trim();
    const title = String(valueAt(record, mapping, "title") ?? "").trim();
    if (!sku || !title) throw new Error(`Row ${rowIndex + 1} is missing a title or product SKU.`);
    let product = products.get(sku.toLowerCase());
    if (!product) {
      product = { title, sku };
      for (const field of ["description", "category", "brand", "image_url", "handle"] as const) {
        const value = valueAt(record, mapping, field); if (value !== undefined && value !== "") product[field] = value;
      }
      for (const field of ["price", "compare_at_price", "stock_quantity"] as const) {
        const value = optionalNumber(valueAt(record, mapping, field), `${field} on row ${rowIndex + 1}`); if (value !== undefined) product[field] = value;
      }
      for (const field of ["images", "options", "variants"] as const) {
        const value = valueAt(record, mapping, field); if (value !== undefined && value !== "") product[field] = jsonValue(value, mapping[field]);
      }
      products.set(sku.toLowerCase(), product);
      optionValues.set(sku.toLowerCase(), new Map());
    }
    const variantSku = String(valueAt(record, mapping, "variant_sku") ?? "").trim();
    if (!variantSku) continue;
    const selected: Record<string, string> = {};
    for (const number of [1, 2, 3] as const) {
      const name = String(valueAt(record, mapping, `option${number}_name`) ?? "").trim();
      const value = String(valueAt(record, mapping, `option${number}_value`) ?? "").trim();
      if (name && value) {
        selected[name] = value;
        const values = optionValues.get(sku.toLowerCase())!;
        if (!values.has(name)) values.set(name, new Set());
        values.get(name)!.add(value);
      }
    }
    const variant = {
      sku: variantSku,
      price: optionalNumber(valueAt(record, mapping, "variant_price"), `Variant price on row ${rowIndex + 1}`) ?? Number(product.price),
      inventory_quantity: optionalNumber(valueAt(record, mapping, "variant_stock"), `Variant inventory on row ${rowIndex + 1}`) ?? 0,
      option_values: selected,
      compare_at_price: optionalNumber(valueAt(record, mapping, "variant_compare_at_price"), `Variant compare-at price on row ${rowIndex + 1}`) ?? null,
      barcode: String(valueAt(record, mapping, "variant_barcode") ?? "").trim() || null,
      image_url: String(valueAt(record, mapping, "variant_image_url") ?? "").trim() || null,
    };
    if (!Array.isArray(product.variants)) product.variants = [];
    product.variants.push(variant);
  }
  for (const [key, product] of products) {
    const values = optionValues.get(key)!;
    if (product.variants?.length && values.size) product.options = [...values].map(([name, entries]) => ({ name, values: [...entries] }));
  }
  return [...products.values()];
}
