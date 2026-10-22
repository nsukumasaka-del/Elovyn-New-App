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

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(text).filter(Boolean);
    } catch { /* Fall back to the original string. */ }
  }
  return trimmed ? [trimmed] : [];
}

export function cjImportProductFromDetail(listEntry: unknown, detailPayload: unknown, inventoryPayload?: unknown) {
  const list = record(listEntry);
  const detail = record(record(detailPayload).data);
  const inventoryData = record(record(inventoryPayload).data);
  const rawVariants = Array.isArray(detail.stanProducts)
    ? detail.stanProducts.map(record)
    : Array.isArray(detail.variants) ? detail.variants.map(record) : [];
  const inventoryByVariant = new Map<string, number>();
  const authoritativeVariantInventory = Array.isArray(inventoryData.variantInventories)
    ? inventoryData.variantInventories
    : Array.isArray(inventoryData.variantInventory) ? inventoryData.variantInventory : null;
  const variantInventory = authoritativeVariantInventory ?? (Array.isArray(detail.variantInventory) ? detail.variantInventory : []);
  if (Array.isArray(variantInventory)) {
    for (const entry of variantInventory.map(record)) {
      const inventory = Array.isArray(entry.inventory) ? entry.inventory.map(record) : [];
      const variantId = text(entry.vid || entry.variantId || entry.id);
      if (variantId) inventoryByVariant.set(variantId, inventory.reduce((sum, warehouse) => sum + number(warehouse.totalInventory), 0));
    }
  }
  const authoritativeProductStock = Array.isArray(inventoryData.inventories)
    ? inventoryData.inventories.map(record).reduce((sum, warehouse) => sum + number(warehouse.totalInventoryNum), 0)
    : null;
  if (inventoryPayload !== undefined && rawVariants.length > 1 && rawVariants.some((variant) => {
    const variantId = text(variant.vid || variant.id);
    return !variantId || !inventoryByVariant.has(variantId);
  })) {
    throw new Error("CJ did not return real-time inventory for every product variant. The product was not imported with an assumed zero quantity.");
  }
  if (inventoryPayload !== undefined && rawVariants.length === 1 && inventoryByVariant.size === 0 && authoritativeProductStock === null) {
    throw new Error("CJ did not return a usable real-time inventory quantity. The product was not imported with an assumed zero quantity.");
  }
  const rawNames = stringArray(detail.variantkeyen || detail.productKeyEn || detail.productKeySet || detail.variantkey)
    .flatMap((value) => value.split("-").filter(Boolean));
  const maximumValues = rawVariants.reduce((maximum, variant) => Math.max(maximum, text(variant.variantkey || variant.variantKey).split("-").filter(Boolean).length), 0);
  const names = Array.from({ length: Math.max(rawNames.length, maximumValues) }, (_, index) => optionName(rawNames[index] || "", index));
  const valuesByOption = names.map(() => new Set<string>());
  const variants = rawVariants.map((variant, variantIndex) => {
    const values = text(variant.variantkey || variant.variantKey).split("-").filter(Boolean);
    const optionValues = Object.fromEntries(names.map((name, index) => {
      const value = values[index] || `Variant ${variantIndex + 1}`;
      valuesByOption[index].add(value);
      return [name, value];
    }));
    return {
      sku: text(variant.sku || variant.variantSku) || `${text(detail.sku || detail.productSku || list.sku)}-${variantIndex + 1}`,
      price: number(variant.sellprice || variant.variantSellPrice || variant.nowPrice, number(detail.sellprice || detail.sellPrice || list.sellPrice)),
      compare_at_price: null,
      inventory_quantity: inventoryByVariant.get(text(variant.vid))
        ?? inventoryByVariant.get(text(variant.id))
        ?? (rawVariants.length === 1 ? authoritativeProductStock : null)
        ?? (Array.isArray(variant.inventories) ? variant.inventories.map(record).reduce((sum, inventory) => sum + number(inventory.totalInventory), 0) : number(variant.totalInventory)),
      barcode: text(variant.barcode) || null,
      image_url: text(variant.img || variant.variantImage) || null,
      option_values: optionValues,
    };
  });
  const images = [detail.bigimg, detail.bigImage, list.bigImage, ...stringArray(detail.newImgList), ...stringArray(detail.productImageSet), ...stringArray(detail.img), ...rawVariants.map((variant) => variant.img || variant.variantImage)]
    .map(text).filter((value, index, entries) => /^https:\/\//i.test(value) && entries.indexOf(value) === index);
  const variantStock = variants.reduce((sum, variant) => sum + variant.inventory_quantity, 0);
  return {
    title: text(detail.nameen || detail.productNameEn || list.nameEn || detail.name),
    sku: text(detail.sku || detail.productSku || list.sku),
    price: number(detail.sellprice || detail.sellPrice || list.sellPrice),
    description: text(detail.description || list.description),
    category: text(detail.category || detail.categoryName || list.threeCategoryName),
    brand: text(detail.supplierNameEn || detail.supplierName || list.supplierName) || "CJ Dropshipping",
    stock_quantity: variants.length ? variantStock : authoritativeProductStock ?? number(detail.totalInventory || list.warehouseInventoryNum),
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
