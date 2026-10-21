import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { createDb } from "../../db";
import {
  carts,
  inventoryItems,
  options,
  orders,
  paymentProviderSettings,
  paymentWebhookEvents,
  products,
  supplierIntegrations,
  supplierSyncHistory,
  users,
  variantOptionValues,
  variants,
} from "../../db/schema";
import {
  clearedSessionCookie,
  clearedOAuthStateCookie,
  createOAuthState,
  createSession,
  deleteSession,
  getSessionUser,
  hashPassword,
  oauthStateCookie,
  primaryAdminEmail,
  readOAuthStateCookie,
  sessionCookie,
  verifyPassword,
  verifyOAuthState,
  type StoreUser,
} from "../lib/auth";
import { readSupplierJsonResponse, supplierUrlValidationError } from "../../src/lib/supplier-validation";
import { createYocoCheckout, registerYocoWebhook, verifyYocoWebhookSignature } from "../lib/yoco";

export interface Env {
  DB?: D1Database;
  PRODUCT_ASSETS?: R2Bucket;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  SUPPLIER_SECRET_ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  JWT_SECRET?: string;
  YOCO_TEST_PUBLIC_KEY?: string;
  YOCO_TEST_SECRET_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
}

const productColumns = {
  id: products.id,
  title: products.title,
  sku: products.sku,
  price: products.price,
  compare_at_price: products.compareAtPrice,
  stock_quantity: products.stockQuantity,
  status: sql<string>`CASE WHEN ${products.stockQuantity} <= 0 THEN 'Out of Stock'
    WHEN ${products.stockQuantity} <= 5 THEN 'Low Stock'
    ELSE 'In Stock' END`.as("status"),
  category: products.category,
  brand: products.brand,
  description: products.description,
  handle: products.handle,
  image_url: products.imageUrl,
  images_json: products.imagesJson,
  updated_at: products.updatedAt,
};

const supplierColumns = {
  id: supplierIntegrations.id,
  name: supplierIntegrations.name,
  api_base_url: supplierIntegrations.apiBaseUrl,
  webhook_url: supplierIntegrations.webhookUrl,
  auto_sync: supplierIntegrations.autoSync,
  is_active: supplierIntegrations.isActive,
  has_api_key: sql<boolean>`(${supplierIntegrations.encryptedApiKey} IS NOT NULL)`.as("has_api_key"),
  adapter: supplierIntegrations.adapter,
  field_mapping_json: supplierIntegrations.fieldMappingJson,
  connection_status: supplierIntegrations.connectionStatus,
  last_sync_at: supplierIntegrations.lastSyncAt,
  last_sync_error: supplierIntegrations.lastSyncError,
  updated_at: supplierIntegrations.updatedAt,
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

async function bodyAsJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2 * 1024 * 1024) {
    throw new ApiError("JSON request bodies must be 2 MB or smaller.", 413);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 2 * 1024 * 1024) {
    throw new ApiError("JSON request bodies must be 2 MB or smaller.", 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError("Request body must be valid JSON.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError("Request body must be a JSON object.", 400);
  }
  return body as Record<string, unknown>;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function requiredString(value: unknown, label: string, maxLength = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new ApiError(`${label} is required and must be no longer than ${maxLength} characters.`, 400);
  }
  return value.trim();
}

function normalizeEmail(value: unknown) {
  const email = requiredString(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError("Enter a valid email address.", 400);
  }
  return email;
}

function requiredPassword(value: unknown) {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new ApiError("Password is required and must be no longer than 256 characters.", 400);
  }
  return value;
}

function configuredAdminEmail(env: Env) {
  const email = env.ADMIN_EMAIL?.trim() || primaryAdminEmail;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError("ADMIN_EMAIL must be a valid email address.", 503);
  }
  return email.toLowerCase();
}

function isConfiguredAdmin(user: StoreUser | null, env: Env): user is StoreUser {
  return !!user && user.role === "admin"
    && user.email.trim().toLowerCase() === configuredAdminEmail(env);
}

async function requireUser(db: ReturnType<typeof createDb>, request: Request) {
  const user = await getSessionUser(db, request);
  if (!user) throw new ApiError("Sign in to continue.", 401);
  return user;
}

async function requireAdmin(db: ReturnType<typeof createDb>, request: Request, env: Env) {
  const user = await getSessionUser(db, request);
  if (!isConfiguredAdmin(user, env)) throw new ApiError("Administrator access is required.", 403);
  return user;
}

async function authenticate(
  db: ReturnType<typeof createDb>,
  env: Env,
  email: string,
  password: string,
): Promise<StoreUser> {
  const adminEmail = configuredAdminEmail(env);
  if (email === adminEmail) {
    const adminPasswordHash = env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash) {
      throw new ApiError("Primary administrator credentials are not configured for this Cloudflare deployment.", 503);
    }
    if (!/^(?:pbkdf2\$100000|pbkdf2-chain\$100000\$6)\$[a-f\d]{32}\$[a-f\d]{64}$/i.test(adminPasswordHash)) {
      throw new ApiError("ADMIN_PASSWORD_HASH is invalid. Regenerate it with the password setup utility.", 503);
    }
    if (!await verifyPassword(password, adminPasswordHash)) {
      throw new ApiError("Email or password is incorrect.", 401);
    }
    const rows = await db
      .insert(users)
      .values({ id: crypto.randomUUID(), email: adminEmail, passwordHash: adminPasswordHash, role: "admin" })
      .onConflictDoUpdate({
        target: users.email,
        set: { passwordHash: adminPasswordHash, role: "admin" },
      })
      .returning({ id: users.id, email: users.email, role: users.role, fullName: users.fullName });
    return rows[0];
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      fullName: users.fullName,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user?.passwordHash || !await verifyPassword(password, user.passwordHash)) {
    throw new ApiError("Email or password is incorrect.", 401);
  }
  return { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
}

function secureCookieAttribute(url: URL) {
  return url.protocol === "https:" ? "; Secure" : "";
}

function randomOAuthState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]!);
}

async function sendWelcomeEmail(env: Env, email: string, fullName: string | null) {
  if (!env.RESEND_API_KEY) {
    console.warn("Welcome email was not sent: RESEND_API_KEY is not configured.");
    return false;
  }
  if (!env.RESEND_FROM_EMAIL) {
    console.warn("Welcome email was not sent: RESEND_FROM_EMAIL is not configured.");
    return false;
  }

  const greeting = fullName ? `Hi ${escapeHtml(fullName)},` : "Welcome,";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [email],
        subject: "Welcome to Elovyn",
        html: `<p>${greeting}</p><p>Your Elovyn account is ready. We’re glad you’re here.</p>`,
        text: `${fullName ? `Hi ${fullName},` : "Welcome,"}\n\nYour Elovyn account is ready. We’re glad you’re here.`,
      }),
    });
    if (!response.ok) {
      console.warn("Welcome email delivery failed:", response.status, (await response.text()).slice(0, 500));
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Welcome email request failed:", error);
    return false;
  }
}

async function authenticateWithGoogle(
  request: Request,
  env: Env,
  db: ReturnType<typeof createDb>,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const secure = secureCookieAttribute(url);
  if (url.searchParams.has("error")) throw new ApiError("Google sign in was cancelled or denied.", 400);
  if (!code || !state || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.JWT_SECRET) {
    throw new ApiError("Google sign in is not configured correctly.", 503);
  }
  if (!await verifyOAuthState(state, readOAuthStateCookie(request), env.JWT_SECRET)) {
    throw new ApiError("Google sign in could not be verified. Please try again.", 400);
  }

  const redirectUri = new URL("/api/auth/callback/google", url.origin).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    console.error("Google token exchange failed:", tokenResponse.status, (await tokenResponse.text()).slice(0, 500));
    throw new ApiError("Google sign in could not be completed. Please try again.", 502);
  }
  const tokenPayload: unknown = await tokenResponse.json();
  if (!tokenPayload || typeof tokenPayload !== "object" || !("access_token" in tokenPayload)
    || typeof tokenPayload.access_token !== "string") {
    throw new ApiError("Google returned an invalid sign-in response.", 502);
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
  });
  if (!profileResponse.ok) {
    console.error("Google profile request failed:", profileResponse.status);
    throw new ApiError("Google profile could not be loaded. Please try again.", 502);
  }
  const profile: unknown = await profileResponse.json();
  if (!profile || typeof profile !== "object" || !("id" in profile) || typeof profile.id !== "string"
    || !("email" in profile) || typeof profile.email !== "string"
    || !("verified_email" in profile) || profile.verified_email !== true) {
    throw new ApiError("Google did not provide a verified email address.", 400);
  }
  const email = normalizeEmail(profile.email);
  const fullName = "name" in profile && typeof profile.name === "string"
    ? profile.name.trim().slice(0, 120) || null
    : null;

  let [user] = await db
    .select({ id: users.id, email: users.email, role: users.role, fullName: users.fullName })
    .from(users)
    .where(eq(users.googleId, profile.id))
    .limit(1);

  if (!user) {
    const [emailUser] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        fullName: users.fullName,
        googleId: users.googleId,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (emailUser?.googleId && emailUser.googleId !== profile.id) {
      throw new ApiError("This email is linked to a different Google account.", 409);
    }
    if (emailUser) {
      [user] = await db.update(users)
        .set({ googleId: profile.id, fullName: fullName ?? emailUser.fullName })
        .where(eq(users.id, emailUser.id))
        .returning({ id: users.id, email: users.email, role: users.role, fullName: users.fullName });
    } else {
      [user] = await db.insert(users)
        .values({
          id: crypto.randomUUID(),
          email,
          passwordHash: null,
          fullName,
          googleId: profile.id,
          role: "customer",
        })
        .onConflictDoNothing()
        .returning({ id: users.id, email: users.email, role: users.role, fullName: users.fullName });
    }
  }

  if (!user) {
    [user] = await db
      .select({ id: users.id, email: users.email, role: users.role, fullName: users.fullName })
      .from(users)
      .where(eq(users.googleId, profile.id))
      .limit(1);
  }
  if (!user) throw new ApiError("Your Google account could not be created. Please try again.", 500);

  const session = await createSession(db, user);
  const headers = new Headers({
    Location: new URL("/", url.origin).toString(),
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", sessionCookie(session.token, session.maxAge, secure));
  headers.append("Set-Cookie", clearedOAuthStateCookie(secure));
  return new Response(null, { status: 302, headers });
}

function statusForStock(quantity: number) {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= 5) return "Low Stock";
  return "In Stock";
}

type ProductOptionInput = { name: string; values: string[] };
type ProductVariantInput = {
  sku: string;
  price: number;
  compare_at_price: number | null;
  barcode: string | null;
  inventory_quantity: number;
  option_values: Record<string, string>;
  image_url: string | null;
};
type ProductInput = {
  title: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  category: string | null;
  brand: string | null;
  description: string | null;
  handle: string;
  image_url: string | null;
  images: string[];
  options: ProductOptionInput[];
  variants: ProductVariantInput[];
};

function normalizedHandle(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function optionalText(value: unknown, label: string, maxLength = 5000): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new ApiError(`${label} must be text no longer than ${maxLength} characters.`, 400);
  }
  return value.trim() || null;
}

function nonNegativeAmount(value: unknown, label: string, fallback: number | null = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ApiError(`${label} must be a non-negative number.`, 400);
  }
  return amount;
}

function normalizeProductInput(value: unknown): ProductInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError("Each imported product must be an object.", 400);
  }
  const body = value as Record<string, unknown>;
  const title = requiredString(body.title, "Product title", 200);
  const sku = requiredString(body.sku, "SKU", 100);
  const rawOptions = body.options === undefined ? [] : body.options;
  if (!Array.isArray(rawOptions) || rawOptions.length > 3) {
    throw new ApiError(`${title}: provide no more than three product options.`, 400);
  }
  const optionNames = new Set<string>();
  const productOptions = rawOptions.map((entry): ProductOptionInput => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ApiError(`${title}: each option must include a name and values.`, 400);
    }
    const option = entry as Record<string, unknown>;
    const name = requiredString(option.name, "Option name", 50);
    if (optionNames.has(name.toLowerCase())) throw new ApiError(`${title}: option names must be unique.`, 400);
    optionNames.add(name.toLowerCase());
    if (!Array.isArray(option.values) || option.values.length < 1 || option.values.length > 100) {
      throw new ApiError(`${title}: each option must have between 1 and 100 values.`, 400);
    }
    const values = option.values.map((item) => requiredString(item, `${name} value`, 100));
    if (new Set(values.map((item) => item.toLowerCase())).size !== values.length) {
      throw new ApiError(`${title}: ${name} values must be unique.`, 400);
    }
    return { name, values };
  });
  const rawVariants = body.variants === undefined || body.variants === null ? [] : body.variants;
  if (!Array.isArray(rawVariants) || rawVariants.length > 100) {
    throw new ApiError(`${title}: provide no more than 100 variants.`, 400);
  }
  const variantInputs = rawVariants.map((entry): ProductVariantInput => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ApiError(`${title}: each variant must be an object.`, 400);
    }
    const variant = entry as Record<string, unknown>;
    const variantSku = requiredString(variant.sku, "Variant SKU", 100);
    const variantPrice = nonNegativeAmount(variant.price, "Variant price");
    const inventory = Number(variant.inventory_quantity ?? 0);
    if (variantPrice === null || !Number.isInteger(inventory) || inventory < 0 || inventory > 10000000) {
      throw new ApiError(`${title}: variant price and inventory must be valid non-negative numbers.`, 400);
    }
    const optionValues = variant.option_values ?? {};
    if (!optionValues || typeof optionValues !== "object" || Array.isArray(optionValues)) {
      throw new ApiError(`${title}: variant option values must be an object.`, 400);
    }
    const normalizedValues: Record<string, string> = {};
    for (const option of productOptions) {
      const selected = requiredString((optionValues as Record<string, unknown>)[option.name], `${option.name} value`, 100);
      if (!option.values.includes(selected)) throw new ApiError(`${title}: unknown ${option.name} value "${selected}".`, 400);
      normalizedValues[option.name] = selected;
    }
    if (Object.keys(optionValues).length !== productOptions.length) {
      throw new ApiError(`${title}: variant option values must match the product options.`, 400);
    }
    return {
      sku: variantSku,
      price: variantPrice,
      compare_at_price: nonNegativeAmount(variant.compare_at_price, "Compare-at price"),
      barcode: optionalText(variant.barcode, "Barcode", 100),
      inventory_quantity: inventory,
      option_values: normalizedValues,
      image_url: optionalText(variant.image_url, "Variant image URL", 500),
    };
  });
  if (productOptions.length && !variantInputs.length) {
    throw new ApiError(`${title}: add at least one variant for the selected options.`, 400);
  }
  if (!productOptions.length && variantInputs.length > 1) {
    throw new ApiError(`${title}: define product options before adding multiple variants.`, 400);
  }
  const variantSkus = variantInputs.map((variant) => variant.sku.toLowerCase());
  if (new Set(variantSkus).size !== variantSkus.length) {
    throw new ApiError(`${title}: variant SKUs must be unique.`, 400);
  }
  if (productOptions.length && variantSkus.includes(sku.toLowerCase())) {
    throw new ApiError(`${title}: the product SKU must not match an option variant SKU.`, 400);
  }
  const basePrice = nonNegativeAmount(body.price, "Price", variantInputs[0]?.price ?? null);
  if (basePrice === null) throw new ApiError(`${title}: price is required.`, 400);
  const rawImages = body.images ?? [];
  if (!Array.isArray(rawImages) || rawImages.length > 20
    || rawImages.some((image) => typeof image !== "string" || image.length > 1000)) {
    throw new ApiError(`${title}: provide no more than 20 valid image URLs.`, 400);
  }
  const imageUrl = optionalText(body.image_url ?? rawImages[0], "Image URL", 1000);
  const images = [...new Set([imageUrl, ...rawImages].filter((image): image is string =>
    typeof image === "string" && image.trim().length > 0,
  ))];
  const handle = normalizedHandle(optionalText(body.handle, "Product handle", 100) ?? title)
    || crypto.randomUUID().slice(0, 8);
  const stockQuantity = variantInputs.length
    ? variantInputs.reduce((total, variant) => total + variant.inventory_quantity, 0)
    : Number(body.stock_quantity ?? 0);
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    throw new ApiError(`${title}: stock quantity must be a non-negative integer.`, 400);
  }
  return {
    title,
    sku,
    price: basePrice,
    compare_at_price: nonNegativeAmount(body.compare_at_price, "Compare-at price"),
    stock_quantity: stockQuantity,
    category: optionalText(body.category, "Category", 100),
    brand: optionalText(body.brand, "Brand", 100),
    description: optionalText(body.description, "Description", 10000),
    handle,
    image_url: imageUrl,
    images,
    options: productOptions,
    variants: variantInputs.length ? variantInputs : [{
      sku,
      price: basePrice,
      compare_at_price: nonNegativeAmount(body.compare_at_price, "Compare-at price"),
      barcode: null,
      inventory_quantity: stockQuantity,
      option_values: {},
      image_url: imageUrl,
    }],
  };
}

function productInsertStatements(env: Env, product: ProductInput, productId: string, updateExisting = false, source?: { supplierId: string; externalId: string }) {
  if (!env.DB) throw new ApiError("The D1 database is unavailable.", 503);
  const productValues = [
    product.title,
    product.sku,
    product.price,
    product.compare_at_price,
    product.stock_quantity,
    statusForStock(product.stock_quantity),
    product.category,
    product.brand,
    product.description,
    product.handle,
    product.image_url,
    JSON.stringify(product.images),
  ];
  const statement = updateExisting
    ? source
      ? env.DB.prepare(`UPDATE products SET
          title = ?, sku = ?, price = ?, compare_at_price = ?, stock_quantity = ?, status = ?, category = ?,
          brand = ?, description = ?, handle = ?, image_url = ?, images_json = ?, supplier_id = ?, supplier_product_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`).bind(...productValues, source.supplierId, source.externalId, productId)
      : env.DB.prepare(`UPDATE products SET
          title = ?, sku = ?, price = ?, compare_at_price = ?, stock_quantity = ?, status = ?, category = ?,
          brand = ?, description = ?, handle = ?, image_url = ?, images_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`).bind(...productValues, productId)
    : source
      ? env.DB.prepare(`INSERT INTO products
          (id, title, sku, price, compare_at_price, stock_quantity, status, category, brand, description, handle, image_url, images_json, supplier_id, supplier_product_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(productId, ...productValues, source.supplierId, source.externalId)
      : env.DB.prepare(`INSERT INTO products
          (id, title, sku, price, compare_at_price, stock_quantity, status, category, brand, description, handle, image_url, images_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(productId, ...productValues);
  const statements: D1PreparedStatement[] = [statement];
  if (updateExisting) {
    statements.push(env.DB.prepare("DELETE FROM variants WHERE product_id = ?").bind(productId));
    statements.push(env.DB.prepare("DELETE FROM options WHERE product_id = ?").bind(productId));
  }
  const optionIds = new Map<string, string>();
  product.options.forEach((option, index) => {
    const optionId = crypto.randomUUID();
    optionIds.set(option.name, optionId);
    statements.push(env.DB!.prepare(
      "INSERT INTO options (id, product_id, name, values_json, position) VALUES (?, ?, ?, ?, ?)",
    ).bind(optionId, productId, option.name, JSON.stringify(option.values), index));
  });
  for (const variant of product.variants) {
    const variantId = crypto.randomUUID();
    const title = Object.values(variant.option_values).join(" / ") || "Default";
    statements.push(env.DB.prepare(`INSERT INTO variants
      (id, product_id, title, sku, price, compare_at_price, barcode, options_json, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        variantId,
        productId,
        title,
        variant.sku,
        variant.price,
        variant.compare_at_price,
        variant.barcode,
        JSON.stringify(variant.option_values),
        variant.image_url,
      ));
    statements.push(env.DB.prepare(
      "INSERT INTO inventory_items (id, variant_id, quantity) VALUES (?, ?, ?)",
    ).bind(crypto.randomUUID(), variantId, variant.inventory_quantity));
    for (const [name, selectedValue] of Object.entries(variant.option_values)) {
      const optionId = optionIds.get(name);
      if (optionId) {
        statements.push(env.DB.prepare(
          "INSERT INTO variant_option_values (variant_id, option_id, value) VALUES (?, ?, ?)",
        ).bind(variantId, optionId, selectedValue));
      }
    }
  }
  if (statements.length > 900) {
    throw new ApiError(`${product.title}: this variant matrix is too large to import in one operation.`, 400);
  }
  return statements;
}

type ProductImportResult = {
  imported: { id: string; title: string; sku: string }[];
  skipped: { title: string; sku: string; reason: string }[];
};

async function processProductImport(env: Env, jobId: string) {
  if (!env.DB) throw new ApiError("The D1 database is unavailable.", 503);
  try {
    const job = await env.DB.prepare("SELECT payload_json FROM product_import_jobs WHERE id = ?")
      .bind(jobId)
      .first<{ payload_json: string }>();
    if (!job) throw new Error("Import job payload was not found.");
    await env.DB.prepare("UPDATE product_import_jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(jobId)
      .run();

    let payload: unknown;
    try {
      payload = JSON.parse(job.payload_json);
    } catch {
      throw new Error("Saved import job payload is invalid.");
    }
    if (!Array.isArray(payload)) throw new Error("Saved import job payload must be a product list.");
    const importedProducts = payload.map(normalizeProductInput);
    const allProductSkus = importedProducts.map((product) => product.sku.toLowerCase());
    const allHandles = importedProducts.map((product) => product.handle.toLowerCase());
    const allVariantSkus = importedProducts.flatMap((product) => product.variants.map((variant) => variant.sku.toLowerCase()));
    const allCheckedSkus = [...new Set([...allProductSkus, ...allVariantSkus])];
    const db = createDb(env.DB);
    const [existingProducts, existingVariants] = await Promise.all([
      db.select({ sku: products.sku, handle: products.handle }).from(products).where(or(
        inArray(sql`lower(${products.sku})`, allProductSkus),
        inArray(sql`lower(${products.handle})`, allHandles),
      )),
      db.select({ sku: variants.sku }).from(variants).where(inArray(sql`lower(${variants.sku})`, allCheckedSkus)),
    ]);
    const productSkuSet = new Set(existingProducts.map((product) => product.sku.toLowerCase()));
    const handleSet = new Set(existingProducts.map((product) => product.handle?.toLowerCase()).filter((handle): handle is string => !!handle));
    const occupiedSkuSet = new Set([
      ...productSkuSet,
      ...existingVariants.map((variant) => variant.sku.toLowerCase()),
    ]);
    const result: ProductImportResult = { imported: [], skipped: [] };
    const insertStatements: D1PreparedStatement[] = [];
    for (const product of importedProducts) {
      const duplicateVariantSku = product.variants.find((variant) => occupiedSkuSet.has(variant.sku.toLowerCase()));
      const duplicateProductSku = occupiedSkuSet.has(product.sku.toLowerCase());
      const duplicateHandle = handleSet.has(product.handle.toLowerCase());
      if (duplicateProductSku || duplicateHandle || duplicateVariantSku) {
        result.skipped.push({
          title: product.title,
          sku: product.sku,
          reason: duplicateProductSku
            ? "Product or variant SKU already exists."
            : duplicateHandle
              ? "Product handle already exists."
              : `Variant SKU ${duplicateVariantSku?.sku} already exists.`,
        });
        continue;
      }
      const id = crypto.randomUUID();
      insertStatements.push(...productInsertStatements(env, product, id));
      occupiedSkuSet.add(product.sku.toLowerCase());
      handleSet.add(product.handle.toLowerCase());
      for (const variant of product.variants) occupiedSkuSet.add(variant.sku.toLowerCase());
      result.imported.push({ id, title: product.title, sku: product.sku });
    }
    if (insertStatements.length) await env.DB.batch(insertStatements);
    await env.DB.prepare(`UPDATE product_import_jobs SET status = 'completed', result_json = ?,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(JSON.stringify(result), jobId)
      .run();
  } catch (error) {
    const message = errorMessage(error).slice(0, 1000);
    console.error(`Product import job ${jobId} failed:`, error);
    await env.DB.prepare(`UPDATE product_import_jobs SET status = 'failed', error = ?,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(message, jobId)
      .run();
  }
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function encryptSecret(value: string, secret: string) {
  if (!secret) {
    throw new ApiError("Set SUPPLIER_SECRET_ENCRYPTION_KEY as a Cloudflare secret before saving supplier credentials.", 503);
  }
  const rawKey = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );
  return `${bytesToHex(iv)}.${bytesToHex(new Uint8Array(encrypted))}`;
}

function hexToBytes(value: string) {
  if (!/^[a-f\d]+$/i.test(value) || value.length % 2) throw new Error("Saved supplier credential is invalid.");
  return new Uint8Array(value.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

async function decryptSecret(value: string, secret: string) {
  if (!secret) throw new ApiError("Supplier credential encryption is not configured.", 503);
  const [ivHex, encryptedHex] = value.split(".");
  if (!ivHex || !encryptedHex) throw new ApiError("Saved supplier credential is invalid.", 500);
  const rawKey = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  try {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: hexToBytes(ivHex) }, key, hexToBytes(encryptedHex)));
  } catch { throw new ApiError("Saved supplier credential could not be decrypted.", 500); }
}

async function ensureYocoWebhook(env: Env, db: ReturnType<typeof createDb>, origin: string) {
  if (!env.YOCO_TEST_SECRET_KEY) throw new ApiError("Yoco test payments are not configured.", 503);
  const [saved] = await db.select().from(paymentProviderSettings).where(eq(paymentProviderSettings.provider, "yoco")).limit(1);
  if (saved?.encryptedWebhookSecret) {
    return decryptSecret(saved.encryptedWebhookSecret, env.SUPPLIER_SECRET_ENCRYPTION_KEY);
  }
  let registered: Awaited<ReturnType<typeof registerYocoWebhook>>;
  try { registered = await registerYocoWebhook(env.YOCO_TEST_SECRET_KEY, `${origin}/api/payments/yoco/webhook`); }
  catch (error) { throw new ApiError(errorMessage(error), 502); }
  const encryptedWebhookSecret = await encryptSecret(registered.secret, env.SUPPLIER_SECRET_ENCRYPTION_KEY);
  await db.insert(paymentProviderSettings).values({
    provider: "yoco",
    mode: registered.mode,
    webhookId: registered.id,
    encryptedWebhookSecret,
  }).onConflictDoUpdate({
    target: paymentProviderSettings.provider,
    set: { mode: registered.mode, webhookId: registered.id, encryptedWebhookSecret, updatedAt: sql`CURRENT_TIMESTAMP` },
  });
  return registered.secret;
}

type CheckoutItem = {
  variant_id: string;
  product_id: string;
  sku: string;
  title: string;
  price: number;
  quantity: number;
};

async function resolveCheckoutItems(env: Env, input: unknown) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 100) throw new ApiError("Your cart must contain between 1 and 100 items.", 400);
  const requested = input.map((item) => {
    if (!item || typeof item !== "object") throw new ApiError("Cart item is invalid.", 400);
    const entry = item as Record<string, unknown>;
    const id = requiredString(entry.id, "Product id", 100);
    const quantity = Number(entry.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new ApiError("Cart quantity must be between 1 and 99.", 400);
    return { id, quantity };
  });
  const resolved: CheckoutItem[] = [];
  for (const requestItem of requested) {
    const variantQuery = `SELECT v.id AS variant_id, p.id AS product_id, v.sku, p.title, v.title AS variant_title,
      v.price, COALESCE(i.quantity, 0) AS available, COALESCE(i.track_quantity, 1) AS track_quantity
      FROM variants v INNER JOIN products p ON p.id = v.product_id
      LEFT JOIN inventory_items i ON i.variant_id = v.id`;
    let row = await env.DB!.prepare(`${variantQuery} WHERE v.id = ? LIMIT 1`).bind(requestItem.id).first<{
      variant_id: string; product_id: string; sku: string; title: string; variant_title: string; price: number; available: number; track_quantity: number;
    }>();
    if (!row) row = await env.DB!.prepare(`${variantQuery} WHERE p.id = ? ORDER BY COALESCE(i.quantity, 0) DESC, v.created_at ASC LIMIT 1`).bind(requestItem.id).first();
    if (!row) throw new ApiError("A product in your bag is no longer available.", 409);
    if (row.track_quantity && row.available < requestItem.quantity) throw new ApiError(`${row.title} does not have enough stock for this order.`, 409);
    const existing = resolved.find((item) => item.variant_id === row.variant_id);
    if (existing) {
      existing.quantity += requestItem.quantity;
      if (row.track_quantity && row.available < existing.quantity) throw new ApiError(`${row.title} does not have enough stock for this order.`, 409);
    } else {
      resolved.push({ variant_id: row.variant_id, product_id: row.product_id, sku: row.sku, title: row.variant_title === "Default" ? row.title : `${row.title} (${row.variant_title})`, price: Number(row.price), quantity: requestItem.quantity });
    }
  }
  return resolved;
}

type SupplierRecord = typeof supplierIntegrations.$inferSelect;

function safeSupplierUrl(value: string, storeHostname = "") {
  const validationError = supplierUrlValidationError(value, storeHostname);
  if (validationError) throw new ApiError(validationError, 400);
  return new URL(value);
}

async function supplierFetch(supplier: SupplierRecord, token: string, validateOnly = false, storeHostname = "") {
  const base = safeSupplierUrl(supplier.apiBaseUrl || (supplier.adapter === "cj" ? "https://developers.cjdropshipping.com/api2.0/v1" : ""), storeHostname);
  const url = supplier.adapter === "cj"
    ? new URL(validateOnly ? "setting/get" : "product/listV2?page=1&size=50", `${base.toString().replace(/\/$/, "")}/`)
    : base;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { headers: token ? { [supplier.adapter === "cj" ? "CJ-Access-Token" : "Authorization"]: supplier.adapter === "cj" ? token : `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" }, redirect: "manual", signal: controller.signal });
    const redirectedUrlError = supplierUrlValidationError(response.url || url.toString(), storeHostname);
    if (redirectedUrlError) throw new ApiError(`Supplier request was redirected to an invalid destination. ${redirectedUrlError}`, 400);
    const result = await readSupplierJsonResponse(response);
    if (!result.ok) throw new ApiError(result.error, 400);
    const payload = result.payload;
    if (supplier.adapter === "cj" && (!payload || typeof payload !== "object" || ((payload as { result?: boolean }).result === false) || ((payload as { success?: boolean }).success === false))) throw new ApiError(`CJ rejected the request: ${String((payload as { message?: unknown }).message || "invalid credentials")}`, 400);
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error && error.name === "AbortError" ? "Supplier request timed out." : `Could not reach supplier: ${errorMessage(error)}`, 400);
  } finally { clearTimeout(timer); }
}

function pathValue(record: unknown, path: string) {
  return path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, record);
}

function supplierProducts(payload: unknown, supplier: SupplierRecord) {
  let records: unknown[] | undefined;
  if (supplier.adapter === "cj") records = pathValue(payload, "data.content.productList") as unknown[] | undefined;
  else records = Array.isArray(payload) ? payload : (pathValue(payload, "products") || pathValue(payload, "data.products") || pathValue(payload, "data")) as unknown[] | undefined;
  if (!Array.isArray(records)) throw new ApiError("Supplier response does not contain a product array.", 400);
  let mapping: Record<string, string> = {};
  try { mapping = JSON.parse(supplier.fieldMappingJson || "{}"); } catch { throw new ApiError("Saved supplier field mapping is invalid.", 500); }
  const defaults = supplier.adapter === "cj" ? { external_id: "id", title: "nameEn", sku: "sku", price: "sellPrice", category: "categoryName", image_url: "bigImage", stock_quantity: "stockQuantity" } : { external_id: "id", title: "title", sku: "sku", price: "price", category: "category", image_url: "image_url", stock_quantity: "stock_quantity", variants: "variants", options: "options" };
  return records.slice(0, 50).map((entry, index) => {
    const mapped = Object.fromEntries(Object.entries({ ...defaults, ...mapping }).map(([key, path]) => [key, pathValue(entry, path)]));
    const rawPrice = typeof mapped.price === "string" ? mapped.price.split("-")[0] : mapped.price;
    return { externalId: String(mapped.external_id ?? mapped.sku ?? index), product: normalizeProductInput({ ...mapped, price: rawPrice, stock_quantity: mapped.stock_quantity ?? 0 }) };
  });
}

async function syncSupplier(env: Env, db: ReturnType<typeof createDb>, supplier: SupplierRecord, token: string, storeHostname = "") {
  const historyId = crypto.randomUUID();
  let imported = 0, updated = 0, total = 0;
  await db.insert(supplierSyncHistory).values({ id: historyId, supplierId: supplier.id, status: "running" });
  await db.update(supplierIntegrations).set({ connectionStatus: "syncing", lastSyncError: null, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(supplierIntegrations.id, supplier.id));
  try {
    const incoming = supplierProducts(await supplierFetch(supplier, token, false, storeHostname), supplier);
    total = incoming.length;
    for (const item of incoming) {
      const existing = await env.DB!.prepare("SELECT id, supplier_id FROM products WHERE (supplier_id = ? AND supplier_product_id = ?) OR lower(sku) = lower(?) LIMIT 1").bind(supplier.id, item.externalId, item.product.sku).first<{ id: string; supplier_id: string | null }>();
      if (existing?.supplier_id && existing.supplier_id !== supplier.id) throw new ApiError(`SKU ${item.product.sku} is already managed by another supplier.`, 409);
      const productId = existing?.id || crypto.randomUUID();
      await env.DB!.batch(productInsertStatements(env, item.product, productId, Boolean(existing), { supplierId: supplier.id, externalId: item.externalId }));
      existing ? updated += 1 : imported += 1;
    }
    await db.update(supplierIntegrations).set({ connectionStatus: "connected", lastSyncAt: sql`CURRENT_TIMESTAMP`, lastSyncError: null, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(supplierIntegrations.id, supplier.id));
    await db.update(supplierSyncHistory).set({ status: "success", importedCount: imported, updatedCount: updated, totalCount: total, finishedAt: sql`CURRENT_TIMESTAMP` }).where(eq(supplierSyncHistory.id, historyId));
    return { imported, updated, total: incoming.length };
  } catch (error) {
    const message = errorMessage(error).slice(0, 1000);
    await db.update(supplierIntegrations).set({ connectionStatus: "error", lastSyncError: message, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(supplierIntegrations.id, supplier.id));
    await db.update(supplierSyncHistory).set({ status: "error", importedCount: imported, updatedCount: updated, totalCount: total, errorMessage: message, finishedAt: sql`CURRENT_TIMESTAMP` }).where(eq(supplierSyncHistory.id, historyId));
    throw error;
  }
}

async function route(
  request: Request,
  env: Env,
  db: ReturnType<typeof createDb>,
  waitUntil: PagesContext["waitUntil"],
) {
  const url = new URL(request.url);
  const path = `/${url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "")}`;
  const method = request.method;

  if (path === "/health" && method === "GET") {
    if (!env.DB) {
      throw new ApiError(
        "The Cloudflare Pages D1 binding DB is not configured. Connect the elovyn-store database to the DB binding and redeploy.",
        503,
      );
    }
    await env.DB.prepare("SELECT 1").first();
    return json({ ok: true, database: "connected" });
  }

  if (path === "/payments/status" && method === "GET") {
    return json({ provider: "yoco", enabled: Boolean(env.YOCO_TEST_PUBLIC_KEY && env.YOCO_TEST_SECRET_KEY), mode: "test" });
  }

  if (path === "/payments/yoco/webhook" && method === "POST") {
    const webhookId = request.headers.get("webhook-id") || "";
    const timestamp = request.headers.get("webhook-timestamp") || "";
    const signature = request.headers.get("webhook-signature") || "";
    const rawBody = await request.text();
    if (!webhookId || !timestamp || !signature) throw new ApiError("Yoco webhook signature headers are missing.", 401);
    const [settings] = await db.select().from(paymentProviderSettings).where(eq(paymentProviderSettings.provider, "yoco")).limit(1);
    if (!settings?.encryptedWebhookSecret) throw new ApiError("Yoco webhook verification is not configured.", 503);
    const webhookSecret = await decryptSecret(settings.encryptedWebhookSecret, env.SUPPLIER_SECRET_ENCRYPTION_KEY);
    if (!await verifyYocoWebhookSignature({ secret: webhookSecret, webhookId, timestamp, signature, rawBody })) {
      throw new ApiError("Yoco webhook signature is invalid or expired.", 401);
    }
    const [processed] = await db.select({ id: paymentWebhookEvents.id }).from(paymentWebhookEvents).where(eq(paymentWebhookEvents.id, webhookId)).limit(1);
    if (processed) return json({ received: true, duplicate: true });
    let event: unknown;
    try { event = JSON.parse(rawBody); } catch { throw new ApiError("Yoco webhook body is invalid JSON.", 400); }
    if (!event || typeof event !== "object") throw new ApiError("Yoco webhook body is invalid.", 400);
    const record = event as { type?: unknown; payload?: unknown };
    const eventType = typeof record.type === "string" ? record.type : "unknown";
    const payload = record.payload && typeof record.payload === "object" ? record.payload as Record<string, unknown> : {};
    const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata as Record<string, unknown> : {};
    const orderId = typeof metadata.orderId === "string" ? metadata.orderId : "";
    const checkoutId = typeof metadata.checkoutId === "string" ? metadata.checkoutId : "";
    const [order] = orderId
      ? await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
      : checkoutId ? await db.select().from(orders).where(eq(orders.paymentReference, checkoutId)).limit(1) : [];
    if (!order) throw new ApiError("Yoco webhook does not match an Elovyn order.", 404);
    if (checkoutId && order.paymentReference && checkoutId !== order.paymentReference) throw new ApiError("Yoco checkout reference does not match the order.", 409);
    const eventStatement = env.DB!.prepare("INSERT INTO payment_webhook_events (id, provider, event_type) VALUES (?, 'yoco', ?)").bind(webhookId, eventType);
    if (eventType === "payment.succeeded") {
      const amount = Number(payload.amount);
      const currency = payload.currency;
      if (!Number.isInteger(amount) || amount !== Math.round(Number(order.totalAmount) * 100) || currency !== "ZAR") {
        throw new ApiError("Yoco payment amount or currency does not match the order.", 409);
      }
      if (order.status === "Paid" || order.status === "Completed" || order.status === "Fulfilled") {
        await env.DB!.batch([eventStatement]);
        return json({ received: true, order_id: order.id });
      }
      let items: CheckoutItem[];
      try { items = JSON.parse(order.itemsJson) as CheckoutItem[]; }
      catch { throw new ApiError("Order items could not be read.", 500); }
      const stockRows = await Promise.all(items.map((item) => env.DB!.prepare("SELECT quantity, track_quantity FROM inventory_items WHERE variant_id = ?").bind(item.variant_id).first<{ quantity: number; track_quantity: number }>()));
      const stockAvailable = items.every((item, index) => stockRows[index] && (!stockRows[index]!.track_quantity || stockRows[index]!.quantity >= item.quantity));
      const paymentId = typeof payload.id === "string" ? payload.id : null;
      if (!stockAvailable) {
        await env.DB!.batch([
          eventStatement,
          env.DB!.prepare("UPDATE orders SET status = 'Payment Review', payment_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?").bind(paymentId, order.id),
        ]);
        return json({ received: true, order_id: order.id, review: true });
      }
      const statements: D1PreparedStatement[] = [eventStatement];
      for (const item of items) {
        statements.push(env.DB!.prepare("UPDATE inventory_items SET quantity = MAX(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE variant_id = ? AND track_quantity = 1").bind(item.quantity, item.variant_id));
      }
      for (const productId of [...new Set(items.map((item) => item.product_id))]) {
        statements.push(env.DB!.prepare(`UPDATE products SET stock_quantity = (SELECT COALESCE(SUM(i.quantity), 0) FROM inventory_items i INNER JOIN variants v ON v.id = i.variant_id WHERE v.product_id = ?), status = CASE WHEN (SELECT COALESCE(SUM(i.quantity), 0) FROM inventory_items i INNER JOIN variants v ON v.id = i.variant_id WHERE v.product_id = ?) <= 0 THEN 'Out of Stock' WHEN (SELECT COALESCE(SUM(i.quantity), 0) FROM inventory_items i INNER JOIN variants v ON v.id = i.variant_id WHERE v.product_id = ?) <= 5 THEN 'Low Stock' ELSE 'In Stock' END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(productId, productId, productId, productId));
      }
      statements.push(env.DB!.prepare("UPDATE orders SET status = 'Paid', payment_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?").bind(paymentId, order.id));
      statements.push(env.DB!.prepare("DELETE FROM carts WHERE user_id = ?").bind(order.userId));
      await env.DB!.batch(statements);
    } else if (eventType === "payment.failed") {
      await env.DB!.batch([
        eventStatement,
        env.DB!.prepare("UPDATE orders SET status = 'Payment Failed', payment_id = ? WHERE id = ? AND status = 'Awaiting Payment'").bind(typeof payload.id === "string" ? payload.id : null, order.id),
      ]);
    } else {
      await env.DB!.batch([eventStatement]);
    }
    return json({ received: true, order_id: order.id });
  }

  if (path === "/auth/google" && method === "GET") {
    if (!env.GOOGLE_CLIENT_ID || !env.JWT_SECRET) {
      throw new ApiError("Google sign in is not configured for this deployment.", 503);
    }
    const state = randomOAuthState();
    const signedState = await createOAuthState(state, env.JWT_SECRET);
    const redirectUri = new URL("/api/auth/callback/google", url.origin).toString();
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    }).toString();
    return new Response(null, {
      status: 302,
      headers: {
        Location: authorizationUrl.toString(),
        "Cache-Control": "no-store",
        "Set-Cookie": oauthStateCookie(signedState, secureCookieAttribute(url)),
      },
    });
  }

  if (path === "/auth/callback/google" && method === "GET") {
    return authenticateWithGoogle(request, env, db);
  }

  if ((path === "/auth/register" || path === "/auth/signup") && method === "POST") {
    try {
      const body = await bodyAsJson(request);
      const email = normalizeEmail(body.email);
      const password = requiredPassword(body.password);
      if (password.length < 10) throw new ApiError("Password must be at least 10 characters.", 400);
      const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) || null : null;
      if (email === configuredAdminEmail(env)) {
        throw new ApiError("This email is reserved for the primary administrator.", 409);
      }
      const passwordHash = await hashPassword(password);
      const rows = await db
        .insert(users)
        .values({ id: crypto.randomUUID(), email, passwordHash, fullName, role: "customer" })
        .onConflictDoNothing({ target: users.email })
        .returning({ id: users.id, email: users.email, role: users.role, fullName: users.fullName });
      if (!rows[0]) throw new ApiError("An account with this email already exists.", 409);
      const [welcomeEmailSent, session] = await Promise.all([
        sendWelcomeEmail(env, email, fullName),
        createSession(db, rows[0]),
      ]);
      const secure = secureCookieAttribute(url);
      return json({ user: rows[0], welcomeEmailSent }, 201, {
        "Set-Cookie": sessionCookie(session.token, session.maxAge, secure),
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("User signup failed:", error);
      return json({ error: errorMessage(error) }, 500);
    }
  }

  if ((path === "/auth/login" || path === "/auth/signin") && method === "POST") {
    try {
      const body = await bodyAsJson(request);
      const email = normalizeEmail(body.email);
      const password = requiredPassword(body.password);
      const user = await authenticate(db, env, email, password);
      const session = await createSession(db, user);
      const secure = secureCookieAttribute(url);
      return json({ user }, 200, {
        "Set-Cookie": sessionCookie(session.token, session.maxAge, secure),
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("User signin failed:", error);
      return json({ error: errorMessage(error) }, 500);
    }
  }

  if ((path === "/auth/session" || path === "/auth/me") && method === "GET") {
    return json({ user: await getSessionUser(db, request) });
  }

  if ((path === "/auth/logout" || path === "/auth/signout") && method === "POST") {
    await deleteSession(db, request);
    const secure = secureCookieAttribute(url);
    return json({ ok: true }, 200, { "Set-Cookie": clearedSessionCookie(secure) });
  }

  if (path === "/products" && method === "GET") {
    const rows = await db.select(productColumns).from(products).orderBy(desc(products.updatedAt));
    return json({ products: rows }, 200, { "Cache-Control": "no-store" });
  }

  if (path.startsWith("/products/") && method === "GET") {
    let productKey: string;
    try {
      productKey = decodeURIComponent(path.slice("/products/".length));
    } catch {
      throw new ApiError("Product was not found.", 404);
    }
    if (!productKey || productKey.length > 120 || productKey.includes("/")) {
      throw new ApiError("Product was not found.", 404);
    }
    const [product] = await db.select(productColumns)
      .from(products)
      .where(or(eq(products.id, productKey), eq(products.handle, productKey)))
      .limit(1);
    if (!product) throw new ApiError("Product was not found.", 404);
    const [productOptions, productVariants] = await Promise.all([
      db.select({
        id: options.id,
        name: options.name,
        values_json: options.valuesJson,
        position: options.position,
      }).from(options).where(eq(options.productId, product.id)).orderBy(asc(options.position)),
      db.select({
        id: variants.id,
        title: variants.title,
        sku: variants.sku,
        price: variants.price,
        compare_at_price: variants.compareAtPrice,
        barcode: variants.barcode,
        options_json: variants.optionsJson,
        image_url: variants.imageUrl,
        inventory_quantity: sql<number>`COALESCE(${inventoryItems.quantity}, 0)`,
        track_quantity: inventoryItems.trackQuantity,
      })
        .from(variants)
        .leftJoin(inventoryItems, eq(inventoryItems.variantId, variants.id))
        .where(eq(variants.productId, product.id))
        .orderBy(asc(variants.createdAt)),
    ]);
    return json({ product, options: productOptions, variants: productVariants });
  }

  if (path === "/cart" && (method === "GET" || method === "PUT")) {
    const user = await requireUser(db, request);
    if (method === "GET") {
      const [saved] = await db
        .select({ itemsJson: carts.itemsJson })
        .from(carts)
        .where(eq(carts.userId, user.id))
        .limit(1);
      if (!saved) return json({ cart: [] });
      try {
        const cart: unknown = JSON.parse(saved.itemsJson);
        if (!Array.isArray(cart)) throw new Error("Cart must be an array.");
        return json({ cart });
      } catch {
        throw new ApiError("Saved cart data is invalid. Clear the saved cart and try again.", 500);
      }
    }
    const body = await bodyAsJson(request);
    if (!Array.isArray(body.cart) || body.cart.length > 100) {
      throw new ApiError("Cart must contain no more than 100 items.", 400);
    }
    const cart = body.cart.map((item) => {
      if (!item || typeof item !== "object") throw new ApiError("Cart item is invalid.", 400);
      const entry = item as Record<string, unknown>;
      const id = requiredString(entry.id, "Product id", 100);
      const quantity = Number(entry.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw new ApiError("Cart quantity must be between 1 and 99.", 400);
      }
      return { id, quantity };
    });
    await db
      .insert(carts)
      .values({ userId: user.id, itemsJson: JSON.stringify(cart) })
      .onConflictDoUpdate({
        target: carts.userId,
        set: { itemsJson: JSON.stringify(cart), updatedAt: sql`CURRENT_TIMESTAMP` },
      });
    return json({ cart });
  }

  if (path === "/orders" && method === "GET") {
    const user = await requireUser(db, request);
    const rows = await db
      .select({
        id: orders.id,
        total_amount: orders.totalAmount,
        status: orders.status,
        items_json: orders.itemsJson,
        created_at: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt));
    return json({ orders: rows });
  }

  if (path === "/orders" && method === "POST") {
    const user = await requireUser(db, request);
    if (!env.YOCO_TEST_SECRET_KEY) throw new ApiError("Yoco test payments are not configured.", 503);
    const body = await bodyAsJson(request);
    const checkoutItems = await resolveCheckoutItems(env, body.items);
    const totalCents = checkoutItems.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
    if (!Number.isSafeInteger(totalCents) || totalCents < 1) throw new ApiError("The order total must be at least R0.01.", 400);
    await ensureYocoWebhook(env, db, url.origin);
    const orderId = crypto.randomUUID();
    await db.insert(orders).values({
      id: orderId,
      userId: user.id,
      totalAmount: totalCents / 100,
      status: "Awaiting Payment",
      itemsJson: JSON.stringify(checkoutItems),
      paymentProvider: "yoco",
    });
    let checkout: Awaited<ReturnType<typeof createYocoCheckout>>;
    try {
      checkout = await createYocoCheckout(env.YOCO_TEST_SECRET_KEY, {
        amount: totalCents,
        currency: "ZAR",
        successUrl: `${url.origin}/payment/success?order=${encodeURIComponent(orderId)}`,
        cancelUrl: `${url.origin}/payment/cancelled?order=${encodeURIComponent(orderId)}`,
        failureUrl: `${url.origin}/payment/failed?order=${encodeURIComponent(orderId)}`,
        metadata: { orderId, userId: user.id },
        externalId: orderId,
        clientReferenceId: orderId,
      });
    } catch (error) {
      await db.update(orders).set({ status: "Payment Failed" }).where(eq(orders.id, orderId));
      throw new ApiError(errorMessage(error), 502);
    }
    await db.update(orders).set({ paymentReference: checkout.id }).where(eq(orders.id, orderId));
    return json({ order_id: orderId, redirect_url: checkout.redirectUrl, mode: checkout.processingMode }, 201);
  }

  if (path.startsWith("/orders/") && method === "GET") {
    const user = await requireUser(db, request);
    const orderId = decodeURIComponent(path.slice("/orders/".length));
    const [order] = await db.select({ id: orders.id, status: orders.status, total_amount: orders.totalAmount, payment_provider: orders.paymentProvider, created_at: orders.createdAt })
      .from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, user.id))).limit(1);
    if (!order) throw new ApiError("Order was not found.", 404);
    return json({ order });
  }

  if (path === "/admin/inventory" && method === "GET") {
    await requireAdmin(db, request, env);
    const rows = await db.select(productColumns).from(products).orderBy(
      sql`CASE WHEN ${products.stockQuantity} > 0 THEN 0 ELSE 1 END`,
      desc(products.stockQuantity),
      asc(products.title),
    );
    const [stats] = await db
      .select({
        total_sales: sql<number>`COALESCE((SELECT SUM(${orders.totalAmount}) FROM ${orders}
          WHERE ${orders.status} IN ('Paid', 'Completed', 'Fulfilled')), 0)`,
        order_count: sql<number>`(SELECT COUNT(*) FROM ${orders})`,
        product_count: sql<number>`COUNT(*)`,
      })
      .from(products);
    return json({ products: rows, stats });
  }

  if (path === "/admin/inventory/stock" && method === "PATCH") {
    await requireAdmin(db, request, env);
    const body = await bodyAsJson(request);
    const id = requiredString(body.id, "Product id", 100);
    const change = Number(body.change);
    if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 9999) {
      throw new ApiError("Stock change must be a non-zero integer.", 400);
    }
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!product) throw new ApiError("Product not found.", 404);
    const [variant] = await db.select({ id: variants.id })
      .from(variants)
      .innerJoin(inventoryItems, eq(inventoryItems.variantId, variants.id))
      .where(eq(variants.productId, id))
      .orderBy(change < 0 ? desc(inventoryItems.quantity) : asc(variants.createdAt))
      .limit(1);
    if (variant && env.DB) {
      await env.DB.batch([
        env.DB.prepare(`UPDATE inventory_items SET quantity = MAX(0, quantity + ?), updated_at = CURRENT_TIMESTAMP
          WHERE variant_id = ?`).bind(change, variant.id),
        env.DB.prepare(`UPDATE products SET
          stock_quantity = (SELECT COALESCE(SUM(inventory_items.quantity), 0)
            FROM inventory_items INNER JOIN variants ON variants.id = inventory_items.variant_id
            WHERE variants.product_id = ?),
          status = CASE
            WHEN (SELECT COALESCE(SUM(inventory_items.quantity), 0)
              FROM inventory_items INNER JOIN variants ON variants.id = inventory_items.variant_id
              WHERE variants.product_id = ?) <= 0 THEN 'Out of Stock'
            WHEN (SELECT COALESCE(SUM(inventory_items.quantity), 0)
              FROM inventory_items INNER JOIN variants ON variants.id = inventory_items.variant_id
              WHERE variants.product_id = ?) <= 5 THEN 'Low Stock'
            ELSE 'In Stock' END,
          updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .bind(id, id, id, id),
      ]);
    } else {
      const newStock = sql`MAX(0, ${products.stockQuantity} + ${change})`;
      await db.update(products)
        .set({
          stockQuantity: newStock,
          status: sql`CASE WHEN ${newStock} <= 0 THEN 'Out of Stock'
                           WHEN ${newStock} <= 5 THEN 'Low Stock'
                           ELSE 'In Stock' END`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(products.id, id));
    }
    const [updated] = await db.select({
      id: products.id,
      stock_quantity: products.stockQuantity,
      status: products.status,
    }).from(products).where(eq(products.id, id)).limit(1);
    return json({ product: updated });
  }

  if (path === "/admin/products" && method === "POST") {
    await requireAdmin(db, request, env);
    const body = await bodyAsJson(request);
    const product = normalizeProductInput(body);
    const incomingSkus = product.variants.map((variant) => variant.sku);
    const allSkus = [...new Set([product.sku, ...incomingSkus].map((sku) => sku.toLowerCase()))];
    const [existingSku] = await db.select({ id: products.id }).from(products)
      .where(or(
        inArray(sql`lower(${products.sku})`, allSkus),
        sql`lower(${products.handle}) = ${product.handle.toLowerCase()}`,
      )).limit(1);
    const [existingVariant] = await db.select({ sku: variants.sku }).from(variants)
      .where(inArray(sql`lower(${variants.sku})`, allSkus)).limit(1);
    if (existingSku || existingVariant) {
      throw new ApiError("A product with this SKU or handle, or a variant with one of these SKUs, already exists.", 409);
    }
    const productId = crypto.randomUUID();
    await env.DB!.batch(productInsertStatements(env, product, productId));
    return json({ product: { id: productId, title: product.title, sku: product.sku, handle: product.handle } }, 201);
  }

  if (path.startsWith("/admin/products/") && method === "PUT") {
    await requireAdmin(db, request, env);
    let productId: string;
    try {
      productId = decodeURIComponent(path.slice("/admin/products/".length));
    } catch {
      throw new ApiError("Product was not found.", 404);
    }
    if (!productId || productId.includes("/") || productId.length > 100) {
      throw new ApiError("Product was not found.", 404);
    }
    const [currentProduct] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
    if (!currentProduct) throw new ApiError("Product was not found.", 404);
    const product = normalizeProductInput(await bodyAsJson(request));
    const allSkus = [...new Set([product.sku, ...product.variants.map((variant) => variant.sku)].map((sku) => sku.toLowerCase()))];
    const [duplicateProduct] = await db.select({ id: products.id }).from(products).where(and(
      ne(products.id, productId),
      or(
        inArray(sql`lower(${products.sku})`, allSkus),
        sql`lower(${products.handle}) = ${product.handle.toLowerCase()}`,
      ),
    )).limit(1);
    const [duplicateVariant] = await db.select({ sku: variants.sku }).from(variants).where(and(
      ne(variants.productId, productId),
      inArray(sql`lower(${variants.sku})`, allSkus),
    )).limit(1);
    if (duplicateProduct || duplicateVariant) {
      throw new ApiError("A product with this SKU or handle, or a variant with one of these SKUs, already exists.", 409);
    }
    await env.DB!.batch(productInsertStatements(env, product, productId, true));
    return json({ product: { id: productId, title: product.title, sku: product.sku, handle: product.handle } });
  }

  if (path.startsWith("/admin/products/import/") && method === "GET") {
    await requireAdmin(db, request, env);
    const jobId = path.slice("/admin/products/import/".length);
    if (!jobId || jobId.includes("/") || jobId.length > 100) throw new ApiError("Import job was not found.", 404);
    const job = await env.DB!.prepare(`SELECT id, status, result_json, error, created_at, updated_at
      FROM product_import_jobs WHERE id = ?`).bind(jobId).first<{
        id: string;
        status: "pending" | "processing" | "completed" | "failed";
        result_json: string | null;
        error: string | null;
        created_at: string;
        updated_at: string;
      }>();
    if (!job) throw new ApiError("Import job was not found.", 404);
    let result: ProductImportResult | null = null;
    if (job.status === "completed" && !job.result_json) {
      throw new ApiError("Completed import job is missing its result.", 500);
    }
    if (job.result_json) {
      try {
        result = JSON.parse(job.result_json) as ProductImportResult;
      } catch {
        throw new ApiError("Saved import result is invalid.", 500);
      }
    }
    return json({
      job_id: job.id,
      status: job.status,
      result,
      error: job.error,
      created_at: job.created_at,
      updated_at: job.updated_at,
    });
  }

  if (path === "/admin/products/import" && method === "POST") {
    await requireAdmin(db, request, env);
    const body = await bodyAsJson(request);
    if (!Array.isArray(body.products) || body.products.length < 1 || body.products.length > 50) {
      throw new ApiError("Import must contain between 1 and 50 products.", 400);
    }
    const importedProducts = body.products.map(normalizeProductInput);
    const statementCount = importedProducts.reduce((total, product) =>
      total + 1 + product.options.length + product.variants.length * (2 + product.options.length), 0);
    if (statementCount > 900) throw new ApiError("Import is too large. Split it into smaller batches.", 413);
    const importedSkuSet = new Set<string>();
    const importedHandleSet = new Set<string>();
    const importedVariantSkuSet = new Set<string>();
    for (const product of importedProducts) {
      const productSku = product.sku.toLowerCase();
      if (importedSkuSet.has(productSku)) throw new ApiError(`Duplicate product SKU in import: ${product.sku}.`, 400);
      importedSkuSet.add(productSku);
      if (importedHandleSet.has(product.handle)) throw new ApiError(`Duplicate product handle in import: ${product.handle}.`, 400);
      importedHandleSet.add(product.handle);
      for (const variant of product.variants) {
        const variantSku = variant.sku.toLowerCase();
        const isDefaultVariant = !product.options.length && variantSku === productSku;
        if (importedVariantSkuSet.has(variantSku) || (importedSkuSet.has(variantSku) && !isDefaultVariant)) {
          throw new ApiError(`Duplicate SKU in import: ${variant.sku}.`, 400);
        }
        importedVariantSkuSet.add(variantSku);
      }
    }
    for (const product of importedProducts) {
      for (const variant of product.variants) {
        const variantSku = variant.sku.toLowerCase();
        if (importedSkuSet.has(variantSku) && (product.options.length || product.sku.toLowerCase() !== variantSku)) {
          throw new ApiError(`Variant SKU ${variant.sku} conflicts with a product SKU in this import.`, 400);
        }
      }
    }
    const jobId = crypto.randomUUID();
    await env.DB!.prepare(`INSERT INTO product_import_jobs (id, status, payload_json)
      VALUES (?, 'pending', ?)`).bind(jobId, JSON.stringify(importedProducts)).run();
    waitUntil(processProductImport(env, jobId));
    return json({ job_id: jobId, status: "pending" }, 202);
  }

  if (path === "/admin/suppliers" && method === "GET") {
    await requireAdmin(db, request, env);
    const suppliers = await db
      .select(supplierColumns)
      .from(supplierIntegrations)
      .orderBy(desc(supplierIntegrations.isActive), asc(supplierIntegrations.name));
    const history = await db.select({
      id: supplierSyncHistory.id,
      supplier_id: supplierSyncHistory.supplierId,
      status: supplierSyncHistory.status,
      imported_count: supplierSyncHistory.importedCount,
      updated_count: supplierSyncHistory.updatedCount,
      total_count: supplierSyncHistory.totalCount,
      error_message: supplierSyncHistory.errorMessage,
      started_at: supplierSyncHistory.startedAt,
      finished_at: supplierSyncHistory.finishedAt,
    }).from(supplierSyncHistory).orderBy(desc(supplierSyncHistory.startedAt)).limit(100);
    return json({ suppliers: suppliers.map((supplier) => ({ ...supplier, sync_history: history.filter((entry) => entry.supplier_id === supplier.id).slice(0, 5) })) });
  }

  if (path === "/admin/suppliers" && method === "PUT") {
    await requireAdmin(db, request, env);
    const body = await bodyAsJson(request);
    const name = requiredString(body.name, "Supplier name", 100);
    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : crypto.randomUUID();
    const adapter = body.adapter === "cj" ? "cj" : "generic_json";
    const apiBaseUrl = typeof body.api_base_url === "string" ? body.api_base_url.trim() : "";
    const webhookUrl = typeof body.webhook_url === "string" ? body.webhook_url.trim() : "";
    if (apiBaseUrl) safeSupplierUrl(apiBaseUrl, url.hostname);
    if (webhookUrl) {
      try {
        const parsed = new URL(webhookUrl);
        if (parsed.protocol !== "https:") throw new Error("https required");
      } catch { throw new ApiError("Webhook URL must be a valid HTTPS URL.", 400); }
    }
    if (!apiBaseUrl && adapter !== "cj") throw new ApiError("A product feed URL is required.", 400);
    const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
    const [saved] = await db.select().from(supplierIntegrations).where(eq(supplierIntegrations.id, id)).limit(1);
    const token = apiKey || (saved?.encryptedApiKey ? await decryptSecret(saved.encryptedApiKey, env.SUPPLIER_SECRET_ENCRYPTION_KEY) : "");
    if (!token && adapter === "cj") throw new ApiError("An API key or access token is required for CJ Dropshipping.", 400);
    const encryptedKey = apiKey ? await encryptSecret(apiKey, env.SUPPLIER_SECRET_ENCRYPTION_KEY) : null;
    const fieldMapping = body.field_mapping && typeof body.field_mapping === "object" && !Array.isArray(body.field_mapping) ? body.field_mapping : {};
    const autoSync = body.auto_sync === true;
    const isActive = body.is_active !== false;
    const values = {
      name,
      apiBaseUrl: apiBaseUrl || null,
      webhookUrl: webhookUrl || null,
      adapter,
      fieldMappingJson: JSON.stringify(fieldMapping),
      connectionStatus: "pending",
      autoSync,
      isActive,
      ...(encryptedKey ? { encryptedApiKey: encryptedKey } : {}),
    };
    const rows = await db
      .insert(supplierIntegrations)
      .values({ id, ...values })
      .onConflictDoUpdate({
        target: supplierIntegrations.id,
        set: { ...values, updatedAt: sql`CURRENT_TIMESTAMP` },
      })
      .returning(supplierColumns);
    const stored = await db.select().from(supplierIntegrations).where(eq(supplierIntegrations.id, id)).limit(1);
    try { await supplierFetch(stored[0], token, true, url.hostname); }
    catch (error) {
      await db.update(supplierIntegrations).set({ connectionStatus: "error", lastSyncError: errorMessage(error).slice(0, 1000), updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(supplierIntegrations.id, id));
      throw error;
    }
    const sync = isActive
      ? await syncSupplier(env, db, stored[0], token, url.hostname)
      : { imported: 0, updated: 0, total: 0 };
    if (!isActive) await db.update(supplierIntegrations).set({ connectionStatus: "connected", lastSyncError: null, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(supplierIntegrations.id, id));
    const refreshed = await db.select(supplierColumns).from(supplierIntegrations).where(eq(supplierIntegrations.id, id)).limit(1);
    return json({ supplier: refreshed[0] ?? rows[0], sync }, 200);
  }

  if (path.startsWith("/admin/suppliers/") && path.endsWith("/sync") && method === "POST") {
    await requireAdmin(db, request, env);
    const id = decodeURIComponent(path.slice("/admin/suppliers/".length, -"/sync".length));
    const [supplier] = await db.select().from(supplierIntegrations).where(eq(supplierIntegrations.id, id)).limit(1);
    if (!supplier) throw new ApiError("Supplier was not found.", 404);
    if (!supplier.isActive) throw new ApiError("This supplier is inactive. Enable it before syncing.", 400);
    if (!supplier.encryptedApiKey && supplier.adapter === "cj") throw new ApiError("Supplier credentials are not configured.", 400);
    const token = supplier.encryptedApiKey ? await decryptSecret(supplier.encryptedApiKey, env.SUPPLIER_SECRET_ENCRYPTION_KEY) : "";
    const sync = await syncSupplier(env, db, supplier, token, url.hostname);
    const refreshed = await db.select(supplierColumns).from(supplierIntegrations).where(eq(supplierIntegrations.id, id)).limit(1);
    return json({ supplier: refreshed[0], sync });
  }

  if (path.startsWith("/admin/suppliers/") && method === "PATCH") {
    await requireAdmin(db, request, env);
    const id = decodeURIComponent(path.slice("/admin/suppliers/".length));
    const body = await bodyAsJson(request);
    if (typeof body.is_active !== "boolean") throw new ApiError("Supplier active status must be true or false.", 400);
    const [existing] = await db.select({ id: supplierIntegrations.id }).from(supplierIntegrations).where(eq(supplierIntegrations.id, id)).limit(1);
    if (!existing) throw new ApiError("Supplier was not found.", 404);
    const [supplier] = await db.update(supplierIntegrations).set({ isActive: body.is_active, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(supplierIntegrations.id, id)).returning(supplierColumns);
    return json({ supplier });
  }

  if (path.startsWith("/assets/") && method === "GET") {
    if (!env.PRODUCT_ASSETS) {
      throw new ApiError("Product image storage is not configured for this deployment.", 503);
    }
    const key = decodeURIComponent(path.slice("/assets/".length));
    if (!key || key.includes("/") || key.includes("..")) throw new ApiError("Asset not found.", 404);
    const asset = await env.PRODUCT_ASSETS.get(key);
    if (!asset) throw new ApiError("Asset not found.", 404);
    return new Response(asset.body, {
      headers: {
        "Content-Type": asset.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  if (path === "/admin/assets" && method === "POST") {
    if (!env.PRODUCT_ASSETS) {
      throw new ApiError("Product image storage is not configured for this deployment.", 503);
    }
    await requireAdmin(db, request, env);
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") throw new ApiError("Select an image to upload.", 400);
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const extension = extensions[file.type];
    if (!extension) throw new ApiError("Upload a JPEG, PNG, WebP, or GIF image.", 400);
    if (file.size > 5 * 1024 * 1024) throw new ApiError("Product images must be 5 MB or smaller.", 413);
    const key = `${crypto.randomUUID()}.${extension}`;
    await env.PRODUCT_ASSETS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    return json({ image_url: `/api/assets/${key}` }, 201);
  }

  throw new ApiError("API route not found.", 404);
}

export async function onRequest(context: PagesContext) {
  try {
    if (!context.env.DB) {
      throw new ApiError(
        "The Cloudflare Pages D1 binding DB is not configured. Connect the elovyn-store database to the DB binding and redeploy.",
        503,
      );
    }
    const db = createDb(context.env.DB);
    return await route(context.request, context.env, db, (promise) => context.waitUntil(promise));
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error("Store API request failed:", error);
    const message = errorMessage(error);
    if (/no such (?:table|column):/i.test(message)) {
      return json({ error: "The store database is missing a required migration. Apply the latest D1 migrations and try again." }, 503);
    }
    if (/UNIQUE constraint failed/i.test(message)) {
      return json({ error: "A product or variant already uses one of these SKUs or this product handle. Choose unique values and try again." }, 409);
    }
    return json({ error: "The request could not be completed. Check the Cloudflare Pages Function logs for details." }, 500);
  }
}
