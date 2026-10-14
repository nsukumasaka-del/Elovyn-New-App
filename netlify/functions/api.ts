import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";
import {
  clearedSessionCookie,
  createSession,
  deleteSession,
  getSessionUser,
  hashPassword,
  primaryAdminEmail,
  sessionCookie,
  verifyPassword,
  type StoreUser,
} from "./lib/auth";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orders, products, supplierIntegrations, users } from "../../db/schema.js";

const productColumns = {
  id: products.id,
  title: products.title,
  sku: products.sku,
  price: products.price,
  stock_quantity: products.stockQuantity,
  status: sql<string>`CASE WHEN ${products.stockQuantity} <= 0 THEN 'Out of Stock'
    WHEN ${products.stockQuantity} <= 5 THEN 'Low Stock'
    ELSE 'In Stock' END`.as("status"),
  category: products.category,
  image_url: products.imageUrl,
  updated_at: products.updatedAt,
};

const supplierColumns = {
  id: supplierIntegrations.id,
  name: supplierIntegrations.name,
  api_base_url: supplierIntegrations.apiBaseUrl,
  webhook_url: supplierIntegrations.webhookUrl,
  auto_sync: supplierIntegrations.autoSync,
  has_api_key: sql<boolean>`(${supplierIntegrations.encryptedApiKey} IS NOT NULL)`.as("has_api_key"),
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
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    throw new ApiError("Request body must be valid JSON.", 400);
  }
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

function isPrimaryAdmin(user: StoreUser | null): user is StoreUser {
  return !!user
    && user.role === "admin"
    && user.email.trim().toLowerCase() === primaryAdminEmail.toLowerCase();
}

async function requireUser(request: Request) {
  const user = await getSessionUser(request);
  if (!user) throw new ApiError("Sign in to continue.", 401);
  return user;
}

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!isPrimaryAdmin(user)) throw new ApiError("Administrator access is required.", 403);
  return user;
}

async function authenticate(email: string, password: string): Promise<StoreUser> {
  if (email === primaryAdminEmail) {
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash) {
      throw new ApiError("Primary administrator credentials are not configured on Netlify.", 503);
    }
    if (!/^scrypt\$[a-f\d]{32}\$[a-f\d]{128}$/i.test(adminPasswordHash)) {
      throw new ApiError("ADMIN_PASSWORD_HASH is invalid. Regenerate it with the setup utility.", 503);
    }
    if (!await verifyPassword(password, adminPasswordHash)) {
      throw new ApiError("Email or password is incorrect.", 401);
    }
    const rows = await db
      .insert(users)
      .values({ id: randomUUID(), email: primaryAdminEmail, passwordHash: adminPasswordHash, role: "admin" })
      .onConflictDoUpdate({ target: users.email, set: { passwordHash: adminPasswordHash, role: "admin" } })
      .returning({ id: users.id, email: users.email, role: users.role });
    return rows[0];
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, role: users.role, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    throw new ApiError("Email or password is incorrect.", 401);
  }
  return { id: user.id, email: user.email, role: user.role };
}

function statusForStock(quantity: number) {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= 5) return "Low Stock";
  return "In Stock";
}

function encryptSecret(value: string) {
  const secret = process.env.SUPPLIER_SECRET_ENCRYPTION_KEY;
  if (!secret) {
    throw new ApiError("Set SUPPLIER_SECRET_ENCRYPTION_KEY on Netlify before saving supplier credentials.", 503);
  }
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}.${cipher.getAuthTag().toString("hex")}.${encrypted.toString("hex")}`;
}

async function route(request: Request) {
  const url = new URL(request.url);
  const path = `/${(url.searchParams.get("path") ?? "").replace(/^\/+|\/+$/g, "")}`;
  const method = request.method;

  if (path === "/auth/register" && method === "POST") {
    const body = await bodyAsJson(request);
    const email = normalizeEmail(body.email);
    const password = requiredString(body.password, "Password", 256);
    if (password.length < 10) throw new ApiError("Password must be at least 10 characters.", 400);
    if (email === primaryAdminEmail) {
      throw new ApiError("This email is reserved for the primary administrator.", 409);
    }
    const passwordHash = await hashPassword(password);
    const rows = await db
      .insert(users)
      .values({ id: randomUUID(), email, passwordHash, role: "customer" })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id, email: users.email, role: users.role });
    if (!rows[0]) throw new ApiError("An account with this email already exists.", 409);
    const session = await createSession(rows[0]);
    return json({ user: rows[0] }, 201, { "Set-Cookie": sessionCookie(session.token, session.maxAge) });
  }

  if (path === "/auth/login" && method === "POST") {
    const body = await bodyAsJson(request);
    const email = normalizeEmail(body.email);
    const password = requiredString(body.password, "Password", 256);
    const user = await authenticate(email, password);
    const session = await createSession(user);
    return json({ user }, 200, { "Set-Cookie": sessionCookie(session.token, session.maxAge) });
  }

  if (path === "/auth/session" && method === "GET") {
    return json({ user: await getSessionUser(request) });
  }

  if (path === "/auth/logout" && method === "POST") {
    await deleteSession(request);
    return json({ ok: true }, 200, { "Set-Cookie": clearedSessionCookie() });
  }

  if (path === "/products" && method === "GET") {
    const rows = await db.select(productColumns).from(products).orderBy(desc(products.updatedAt));
    return json({ products: rows });
  }

  if (path === "/cart" && (method === "GET" || method === "PUT")) {
    const user = await requireUser(request);
    const store = getStore("elovyn-carts");
    const key = `user-${user.id}`;
    if (method === "GET") {
      const cart = await store.get(key, { type: "json" }) ?? [];
      return json({ cart });
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
    await store.setJSON(key, cart);
    return json({ cart });
  }

  if (path === "/orders" && method === "GET") {
    const user = await requireUser(request);
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
    await requireUser(request);
    throw new ApiError(
      "Online checkout is unavailable because no payment provider is configured. Your cart and inventory have not been changed.",
      503,
    );
  }

  if (path === "/admin/inventory" && method === "GET") {
    await requireAdmin(request);
    const rows = await db.select(productColumns).from(products).orderBy(asc(products.title));
    const [stats] = await db
      .select({
        total_sales: sql<string>`(SELECT COALESCE(SUM(${orders.totalAmount}), 0) FROM ${orders}
          WHERE ${orders.status} IN ('Paid', 'Completed', 'Fulfilled'))`,
        order_count: sql<string>`(SELECT COUNT(*) FROM ${orders})`,
        product_count: sql<string>`(SELECT COUNT(*) FROM ${products})`,
      })
      .from(sql`(SELECT 1) AS stats`);
    return json({ products: rows, stats });
  }

  if (path === "/admin/inventory/stock" && method === "PATCH") {
    await requireAdmin(request);
    const body = await bodyAsJson(request);
    const id = requiredString(body.id, "Product id", 100);
    const change = Number(body.change);
    if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 9999) {
      throw new ApiError("Stock change must be a non-zero integer.", 400);
    }
    const newStock = sql`GREATEST(0, ${products.stockQuantity} + ${change})`;
    const updated = await db
      .update(products)
      .set({
        stockQuantity: newStock,
        status: sql`CASE WHEN ${newStock} <= 0 THEN 'Out of Stock'
                         WHEN ${newStock} <= 5 THEN 'Low Stock'
                         ELSE 'In Stock' END`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(products.id, id))
      .returning({ id: products.id, stock_quantity: products.stockQuantity, status: products.status });
    if (!updated[0]) throw new ApiError("Product not found.", 404);
    return json({ product: updated[0] });
  }

  if (path === "/admin/products" && method === "POST") {
    await requireAdmin(request);
    const body = await bodyAsJson(request);
    const title = requiredString(body.title, "Product title");
    const sku = requiredString(body.sku, "SKU", 100);
    const price = Number(body.price);
    const stock = Number(body.stock_quantity);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      throw new ApiError("Price and stock quantity must be valid non-negative numbers.", 400);
    }
    const category = requiredString(body.category, "Category", 100);
    const imageUrl = typeof body.image_url === "string" ? body.image_url.slice(0, 500) : null;
    const status = statusForStock(stock);
    const rows = await db
      .insert(products)
      .values({
        id: randomUUID(), title, sku, price: price.toFixed(2), stockQuantity: stock, status, category, imageUrl,
      })
      .onConflictDoNothing({ target: products.sku })
      .returning({
        id: products.id,
        title: products.title,
        sku: products.sku,
        price: products.price,
        stock_quantity: products.stockQuantity,
        status: products.status,
        category: products.category,
        image_url: products.imageUrl,
        updated_at: products.updatedAt,
      });
    if (!rows[0]) throw new ApiError("A product with this SKU already exists.", 409);
    return json({ product: rows[0] }, 201);
  }

  if (path === "/admin/suppliers" && method === "GET") {
    await requireAdmin(request);
    const suppliers = await db
      .select(supplierColumns)
      .from(supplierIntegrations)
      .orderBy(asc(supplierIntegrations.name));
    return json({ suppliers });
  }

  if (path === "/admin/suppliers" && method === "PUT") {
    await requireAdmin(request);
    const body = await bodyAsJson(request);
    const name = requiredString(body.name, "Supplier name", 100);
    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : randomUUID();
    const apiBaseUrl = typeof body.api_base_url === "string" ? body.api_base_url.trim() : "";
    const webhookUrl = typeof body.webhook_url === "string" ? body.webhook_url.trim() : "";
    for (const [label, value] of [["API base URL", apiBaseUrl], ["Webhook URL", webhookUrl]] as const) {
      if (value) {
        try {
          const parsed = new URL(value);
          if (parsed.protocol !== "https:") throw new Error("https required");
        } catch {
          throw new ApiError(`${label} must be a valid HTTPS URL.`, 400);
        }
      }
    }
    const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
    const encryptedKey = apiKey ? encryptSecret(apiKey) : null;
    const autoSync = body.auto_sync === true;
    const values = {
      name,
      apiBaseUrl: apiBaseUrl || null,
      webhookUrl: webhookUrl || null,
      autoSync,
      ...(encryptedKey ? { encryptedApiKey: encryptedKey } : {}),
    };
    const rows = await db
      .insert(supplierIntegrations)
      .values({ id, ...values })
      .onConflictDoUpdate({ target: supplierIntegrations.id, set: { ...values, updatedAt: sql`NOW()` } })
      .returning(supplierColumns);
    return json({ supplier: rows[0] }, 200);
  }

  if (path.startsWith("/assets/") && method === "GET") {
    const key = decodeURIComponent(path.slice("/assets/".length));
    if (!key || key.includes("/") || key.includes("..")) throw new ApiError("Asset not found.", 404);
    const asset = await getStore("elovyn-product-assets").get(key, { type: "arrayBuffer" });
    if (!asset) throw new ApiError("Asset not found.", 404);
    const contentType = key.endsWith(".png") ? "image/png"
      : key.endsWith(".webp") ? "image/webp"
        : key.endsWith(".gif") ? "image/gif" : "image/jpeg";
    return new Response(asset, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  if (path === "/admin/assets" && method === "POST") {
    await requireAdmin(request);
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
    const key = `${randomUUID()}.${extension}`;
    await getStore("elovyn-product-assets").set(key, file, {
      metadata: { contentType: file.type },
    });
    return json({ image_url: `/api/assets/${key}` }, 201);
  }

  throw new ApiError("API route not found.", 404);
}

export default async (request: Request) => {
  try {
    return await route(request);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error("Store API request failed:", error);
    return json({ error: "The request could not be completed. Check the function logs for details." }, 500);
  }
};
