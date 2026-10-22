export type SupplierCredentials = { apiKey: string; apiSecret: string };

type JsonRecord = Record<string, unknown>;

export type SupplierRequestConfiguration = {
  method: "GET" | "POST" | "PUT";
  headers: Record<string, string>;
  query: Record<string, unknown>;
  body?: unknown;
};

export type SupplierConfiguration = {
  productsPath: string;
  fields: Record<string, string>;
  request: SupplierRequestConfiguration;
};

const reservedConfigurationKeys = new Set([
  "products_path", "productsPath", "fields", "request", "method", "headers", "query", "body",
]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function pathValue(record: unknown, path: string): unknown {
  if (!path) return record;
  const segments = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  return segments.reduce<unknown>((value, key) => {
    if (Array.isArray(value) && /^\d+$/.test(key)) return value[Number(key)];
    return isRecord(value) ? value[key] : undefined;
  }, record);
}

function stringRecord(value: unknown, label: string) {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error(`${label} must be a JSON object.`);
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (typeof entry !== "string") throw new Error(`${label}.${key} must be text.`);
    return [key, entry];
  }));
}

export function parseSupplierConfiguration(raw: string): SupplierConfiguration {
  let parsed: unknown;
  try { parsed = JSON.parse(raw || "{}"); } catch { throw new Error("Saved supplier configuration is invalid JSON."); }
  if (!isRecord(parsed)) throw new Error("Supplier configuration must be a JSON object.");
  const requestSource = isRecord(parsed.request) ? parsed.request : parsed;
  const methodValue = String(requestSource.method || "GET").toUpperCase();
  if (!["GET", "POST", "PUT"].includes(methodValue)) throw new Error("Supplier request method must be GET, POST, or PUT.");
  const fields = isRecord(parsed.fields)
    ? stringRecord(parsed.fields, "fields")
    : Object.fromEntries(Object.entries(parsed).filter(([key, value]) => !reservedConfigurationKeys.has(key) && typeof value === "string")) as Record<string, string>;
  return {
    productsPath: String(parsed.products_path || parsed.productsPath || "products"),
    fields,
    request: {
      method: methodValue as SupplierRequestConfiguration["method"],
      headers: stringRecord(requestSource.headers, "headers"),
      query: isRecord(requestSource.query) ? requestSource.query : {},
      ...(Object.prototype.hasOwnProperty.call(requestSource, "body") ? { body: requestSource.body } : {}),
    },
  };
}

export function interpolateSupplierValue(value: unknown, credentials: SupplierCredentials, timestamp: string): unknown {
  if (typeof value === "string") {
    return value
      .replaceAll("{{api_key}}", credentials.apiKey)
      .replaceAll("{{api_secret}}", credentials.apiSecret)
      .replaceAll("{{timestamp}}", timestamp)
      .replaceAll("{{timestamp_ms}}", timestamp);
  }
  if (Array.isArray(value)) return value.map((entry) => interpolateSupplierValue(entry, credentials, timestamp));
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, interpolateSupplierValue(entry, credentials, timestamp)]));
  return value;
}

export function configuredSupplierRequest(base: URL, configuration: SupplierConfiguration, credentials: SupplierCredentials, timestamp = String(Date.now())) {
  const url = new URL(base.toString());
  const query = interpolateSupplierValue(configuration.request.query, credentials, timestamp) as JsonRecord;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) url.searchParams.append(key, typeof entry === "string" ? entry : JSON.stringify(entry));
  }
  const blockedHeaders = /^(?:host|content-length|cookie|origin|referer|connection|cf-|sec-)/i;
  const configuredHeaders = interpolateSupplierValue(configuration.request.headers, credentials, timestamp) as Record<string, string>;
  const headers: Record<string, string> = { Accept: "application/json" };
  for (const [name, value] of Object.entries(configuredHeaders)) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || blockedHeaders.test(name)) throw new Error(`Supplier header ${name} is not allowed.`);
    headers[name] = value;
  }
  if (!Object.keys(configuredHeaders).length && credentials.apiKey) headers.Authorization = `Bearer ${credentials.apiKey}`;
  let body: string | undefined;
  if (configuration.request.body !== undefined) {
    if (configuration.request.method === "GET") throw new Error("GET supplier requests cannot include a request body.");
    headers["Content-Type"] ||= "application/json";
    body = JSON.stringify(interpolateSupplierValue(configuration.request.body, credentials, timestamp));
  }
  return { url, init: { method: configuration.request.method, headers, ...(body ? { body } : {}) } satisfies RequestInit };
}

export function configuredSupplierRecords(payload: unknown, configuration: SupplierConfiguration): unknown[] {
  if (Array.isArray(payload) && (!configuration.productsPath || configuration.productsPath === "products")) return payload;
  const records = configuration.productsPath === "products"
    ? pathValue(payload, "products") ?? pathValue(payload, "data.products") ?? pathValue(payload, "data")
    : pathValue(payload, configuration.productsPath);
  if (!Array.isArray(records)) throw new Error(`Supplier response path "${configuration.productsPath}" does not contain a product array.`);
  return records;
}

// Cloudflare Web Crypto intentionally does not expose MD5. EPROLO's legacy API
// requires it for request signing, so this compact implementation operates on
// UTF-8 bytes and is used only for that compatibility signature.
export function md5(value: string): string {
  const bytes = [...new TextEncoder().encode(value)];
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let index = 0; index < 8; index += 1) bytes.push(Math.floor(bitLength / (2 ** (8 * index))) & 0xff);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const shifts = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const constants = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => {
      const start = offset + index * 4;
      return (bytes[start] | bytes[start + 1] << 8 | bytes[start + 2] << 16 | bytes[start + 3] << 24) >>> 0;
    });
    let a = a0, b = b0, c = c0, d = d0;
    for (let index = 0; index < 64; index += 1) {
      let f: number, g: number;
      if (index < 16) { f = (b & c) | (~b & d); g = index; }
      else if (index < 32) { f = (d & b) | (~d & c); g = (5 * index + 1) % 16; }
      else if (index < 48) { f = b ^ c ^ d; g = (3 * index + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * index) % 16; }
      const sum = (a + f + constants[index] + words[g]) >>> 0;
      const rotated = ((sum << shifts[index]) | (sum >>> (32 - shifts[index]))) >>> 0;
      [a, b, c, d] = [d, (b + rotated) >>> 0, b, c];
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0].map((word) => [0, 8, 16, 24].map((shift) => ((word >>> shift) & 0xff).toString(16).padStart(2, "0")).join("")).join("");
}

export function eproloSignature(apiKey: string, timestamp: string, apiSecret: string) {
  return md5(`${apiKey}${timestamp}${apiSecret}`);
}

export function eproloProductListRequest(baseUrl: URL, credentials: SupplierCredentials, timestamp = String(Date.now()), page = 1) {
  const url = new URL(baseUrl.toString());
  const endpoint = "eprolo_product_list.html";
  if (!url.pathname.toLowerCase().endsWith(`/${endpoint}`)) {
    const basePath = url.pathname.replace(/\/+$/, "");
    const directoryPath = basePath.toLowerCase().endsWith(".html")
      ? basePath.slice(0, basePath.lastIndexOf("/") + 1)
      : `${basePath}/`;
    url.pathname = `${directoryPath}${endpoint}`.replace(/\/{2,}/g, "/");
  }
  url.search = "";
  url.hash = "";
  url.searchParams.set("page", String(Math.max(1, Math.floor(page))));
  url.searchParams.set("timestamp", timestamp);
  url.searchParams.set("sign", eproloSignature(credentials.apiKey, timestamp, credentials.apiSecret));
  return {
    url,
    init: {
      method: "GET",
      headers: { Accept: "application/json", "Content-Type": "application/json", apiKey: credentials.apiKey },
    } satisfies RequestInit,
  };
}

function absoluteImageUrl(value: unknown) {
  const url = String(value || "").trim();
  return url.startsWith("//") ? `https:${url}` : url.replace(/^http:\/\//i, "https://");
}

export function normalizeEproloProducts(payload: unknown) {
  if (!isRecord(payload) || String(payload.code) !== "0") throw new Error(`EPROLO rejected the request: ${String(isRecord(payload) ? payload.msg || "unknown error" : "invalid response")}`);
  if (!Array.isArray(payload.data)) throw new Error("EPROLO response does not contain a product array.");
  return payload.data.map((entry, productIndex) => {
    if (!isRecord(entry)) throw new Error(`EPROLO product ${productIndex + 1} is invalid.`);
    const externalId = String(entry.id || "").trim();
    const rawVariants = (Array.isArray(entry.variantlist) ? entry.variantlist : []).filter(isRecord).slice(0, 100);
    const seenOptionNames = new Set<string>();
    const optionDefinitions = (Array.isArray(entry.optionlist) ? entry.optionlist.filter(isRecord) : [])
      .sort((left, right) => Number(left.position || 0) - Number(right.position || 0))
      .map((option, index) => ({ option, slot: Math.min(3, Math.max(1, Number(option.position) || index + 1)) }))
      .filter(({ option, slot }) => {
        const name = String(option.name || `Option ${slot}`).trim().toLowerCase();
        if (seenOptionNames.has(name) || !rawVariants.every((variant) => String(variant[`option${slot}`] || "").trim())) return false;
        seenOptionNames.add(name);
        return true;
      })
      .slice(0, 3);
    const imageEntries = Array.isArray(entry.imagelist) ? entry.imagelist.filter(isRecord) : [];
    const imageById = new Map(imageEntries.map((image) => [String(image.id || image.images_id || ""), absoluteImageUrl(image.src)]));
    const useSyntheticOption = rawVariants.length > 1 && !optionDefinitions.length;
    const variants = rawVariants.map((variant, variantIndex) => {
      const optionValues: Record<string, string> = {};
      optionDefinitions.forEach(({ option, slot }) => {
        optionValues[String(option.name || `Option ${slot}`).trim()] = String(variant[`option${slot}`]).trim().slice(0, 100);
      });
      if (useSyntheticOption) optionValues.Variant = String(variant.sku || variant.id || `Variant ${variantIndex + 1}`).trim().slice(0, 100);
      const upstreamSku = String(variant.sku || variant.id || variantIndex + 1).trim();
      return {
        sku: `EPROLO-${externalId || productIndex}-${upstreamSku}`.slice(0, 100),
        price: Number(variant.cost || 0),
        inventory_quantity: Math.max(0, Math.floor(Number(variant.inventory_quantity ?? variant.inventory ?? variant.stock ?? variant.quantity ?? 0))),
        option_values: optionValues,
        image_url: imageById.get(String(variant.imagesid || "")) || null,
      };
    });
    const images = [...new Set([absoluteImageUrl(entry.imagefirst), ...imageEntries.map((image) => absoluteImageUrl(image.src))].filter(Boolean))].slice(0, 20);
    const options = optionDefinitions.map(({ option, slot }) => {
      const name = String(option.name || `Option ${slot}`).trim();
      return { name, values: [...new Set(variants.map((variant) => variant.option_values[name]).filter(Boolean))].slice(0, 100) };
    }).filter((option) => option.values.length);
    if (useSyntheticOption) options.push({ name: "Variant", values: variants.map((variant) => variant.option_values.Variant) });
    const price = variants.length ? Math.min(...variants.map((variant) => variant.price)) : Number(entry.cost || 0);
    const upstreamHandle = String(entry.handle || "").trim();
    return {
      externalId: externalId || String(productIndex),
      product: {
        title: String(entry.title || "").trim().slice(0, 200),
        description: String(entry.body_html || "").slice(0, 10000),
        sku: `EPROLO-${externalId || productIndex}`.slice(0, 100),
        handle: upstreamHandle ? `${upstreamHandle.slice(0, 80)}-${externalId || productIndex}`.slice(0, 100) : undefined,
        price,
        stock_quantity: variants.reduce((total, variant) => total + variant.inventory_quantity, 0),
        category: String(entry.wareTypeTwoId || entry.wareTypeId || "EPROLO").replace(/^,|,$/g, ""),
        image_url: images[0] || null,
        images,
        options,
        variants,
      },
    };
  });
}
