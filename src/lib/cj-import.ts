type UnknownRecord = Record<string, unknown>;

export type SupplierProductSearchResult = {
  id: string;
  sku: string;
  title: string;
  image_url: string;
  price: number;
  category: string;
  currency: string;
};

export type SupplierCategory = { id: string; name: string; group: string };

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(typeof value === "string" ? value.split("-")[0] : value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function optionName(value: string, index: number) {
  const normalized = value.replace(/[_-]+/g, " ").trim();
  return normalized ? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : `Option ${index + 1}`;
}

export function cjImportProductFromDetail(listEntry: unknown, detailPayload: unknown) {
  const list = record(listEntry);
  const detail = record(record(detailPayload).data);
  const rawVariants = Array.isArray(detail.stanProducts) ? detail.stanProducts.map(record) : [];
  const inventoryByVariant = new Map<string, number>();
  if (Array.isArray(detail.variantInventory)) {
    for (const entry of detail.variantInventory.map(record)) {
      const inventory = Array.isArray(entry.inventory) ? entry.inventory.map(record) : [];
      inventoryByVariant.set(text(entry.vid), inventory.reduce((sum, warehouse) => sum + number(warehouse.totalInventory), 0));
    }
  }
  const rawNames = text(detail.variantkeyen || detail.variantkey).split("-").filter(Boolean);
  const maximumValues = rawVariants.reduce((maximum, variant) => Math.max(maximum, text(variant.variantkey).split("-").filter(Boolean).length), 0);
  const names = Array.from({ length: Math.max(rawNames.length, maximumValues) }, (_, index) => optionName(rawNames[index] || "", index));
  const valuesByOption = names.map(() => new Set<string>());
  const variants = rawVariants.map((variant, variantIndex) => {
    const values = text(variant.variantkey).split("-").filter(Boolean);
    const optionValues = Object.fromEntries(names.map((name, index) => {
      const value = values[index] || `Variant ${variantIndex + 1}`;
      valuesByOption[index].add(value);
      return [name, value];
    }));
    return {
      sku: text(variant.sku) || `${text(detail.sku || list.sku)}-${variantIndex + 1}`,
      price: number(variant.sellprice, number(detail.sellprice || list.sellPrice)),
      compare_at_price: null,
      inventory_quantity: inventoryByVariant.get(text(variant.id)) ?? number(variant.totalInventory),
      barcode: text(variant.barcode) || null,
      image_url: text(variant.img) || null,
      option_values: optionValues,
    };
  });
  const images = [detail.bigimg, list.bigImage, ...(Array.isArray(detail.newImgList) ? detail.newImgList : []), ...rawVariants.map((variant) => variant.img)]
    .map(text).filter((value, index, entries) => /^https:\/\//i.test(value) && entries.indexOf(value) === index);
  const variantStock = variants.reduce((sum, variant) => sum + variant.inventory_quantity, 0);
  return {
    title: text(detail.nameen || list.nameEn || detail.name),
    sku: text(detail.sku || list.sku),
    price: number(detail.sellprice || list.sellPrice),
    description: text(detail.description || list.description),
    category: text(detail.category || list.threeCategoryName),
    brand: text(detail.supplierNameEn || detail.supplierName || list.supplierName) || "CJ Dropshipping",
    stock_quantity: variantStock || number(detail.totalInventory || list.warehouseInventoryNum),
    image_url: images[0] || "",
    images,
    options: names.map((name, index) => ({ name, values: [...valuesByOption[index]] })).filter((option) => option.values.length),
    variants,
  };
}

export function cjSearchResultsFromPayload(payload: unknown): SupplierProductSearchResult[] {
  const data = record(record(payload).data);
  const groups = Array.isArray(data.content) ? data.content.map(record) : [];
  return groups.flatMap((group) => Array.isArray(group.productList) ? group.productList.map(record) : [])
    .map((product) => ({
      id: text(product.id),
      sku: text(product.sku || product.spu),
      title: text(product.nameEn),
      image_url: text(product.bigImage),
      price: number(product.nowPrice || product.discountPrice || product.sellPrice),
      category: text(product.threeCategoryName || product.twoCategoryName),
      currency: "USD",
    }))
    .filter((product) => product.id && product.title);
}

export function cjCategoriesFromPayload(payload: unknown): SupplierCategory[] {
  const data = Array.isArray(record(payload).data) ? record(payload).data as unknown[] : [];
  const categories: SupplierCategory[] = [];
  for (const firstValue of data) {
    const first = record(firstValue);
    const firstName = text(first.categoryFirstName);
    const secondLevels = Array.isArray(first.categoryFirstList) ? first.categoryFirstList : [];
    for (const secondValue of secondLevels) {
      const second = record(secondValue);
      const secondName = text(second.categorySecondName);
      const thirdLevels = Array.isArray(second.categorySecondList) ? second.categorySecondList : [];
      for (const thirdValue of thirdLevels) {
        const third = record(thirdValue);
        const id = text(third.categoryId);
        const name = text(third.categoryName);
        if (id && name) categories.push({ id, name, group: [firstName, secondName].filter(Boolean).join(" / ") });
      }
    }
  }
  return categories;
}
