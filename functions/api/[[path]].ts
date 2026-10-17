import { asc, desc, eq, sql } from "drizzle-orm";
import { createDb } from "../../db";
import { carts, orders, products, supplierIntegrations, users } from "../../db/schema";
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

export interface Env {
  DB?: D1Database;
  PRODUCT_ASSETS?: R2Bucket;
  ADMIN_PASSWORD_HASH: string;
  SUPPLIER_SECRET_ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  JWT_SECRET?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

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

function isPrimaryAdmin(user: StoreUser | null): user is StoreUser {
  return !!user
    && user.role === "admin"
    && user.email.trim().toLowerCase() === primaryAdminEmail.toLowerCase();
}

async function requireUser(db: ReturnType<typeof createDb>, request: Request) {
  const user = await getSessionUser(db, request);
  if (!user) throw new ApiError("Sign in to continue.", 401);
  return user;
}

async function requireAdmin(db: ReturnType<typeof createDb>, request: Request) {
  const user = await getSessionUser(db, request);
  if (!isPrimaryAdmin(user)) throw new ApiError("Administrator access is required.", 403);
  return user;
}

async function authenticate(
  db: ReturnType<typeof createDb>,
  env: Env,
  email: string,
  password: string,
): Promise<StoreUser> {
  if (email === primaryAdminEmail) {
    const adminPasswordHash = env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash) {
      throw new ApiError("Primary administrator credentials are not configured for this Cloudflare deployment.", 503);
    }
    if (!/^pbkdf2\$\d{6,7}\$[a-f\d]{32}\$[a-f\d]{64}$/i.test(adminPasswordHash)) {
      throw new ApiError("ADMIN_PASSWORD_HASH is invalid. Regenerate it with the password setup utility.", 503);
    }
    if (!await verifyPassword(password, adminPasswordHash)) {
      throw new ApiError("Email or password is incorrect.", 401);
    }
    const rows = await db
      .insert(users)
      .values({ id: crypto.randomUUID(), email: primaryAdminEmail, passwordHash: adminPasswordHash, role: "admin" })
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

async function route(request: Request, env: Env, db: ReturnType<typeof createDb>) {
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
      if (email === primaryAdminEmail) {
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
    return json({ products: rows });
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
    await requireUser(db, request);
    throw new ApiError(
      "Online checkout is unavailable because no payment provider is configured. Your cart and inventory have not been changed.",
      503,
    );
  }

  if (path === "/admin/inventory" && method === "GET") {
    await requireAdmin(db, request);
    const rows = await db.select(productColumns).from(products).orderBy(asc(products.title));
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
    await requireAdmin(db, request);
    const body = await bodyAsJson(request);
    const id = requiredString(body.id, "Product id", 100);
    const change = Number(body.change);
    if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 9999) {
      throw new ApiError("Stock change must be a non-zero integer.", 400);
    }
    const newStock = sql`MAX(0, ${products.stockQuantity} + ${change})`;
    const updated = await db
      .update(products)
      .set({
        stockQuantity: newStock,
        status: sql`CASE WHEN ${newStock} <= 0 THEN 'Out of Stock'
                         WHEN ${newStock} <= 5 THEN 'Low Stock'
                         ELSE 'In Stock' END`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(products.id, id))
      .returning({ id: products.id, stock_quantity: products.stockQuantity, status: products.status });
    if (!updated[0]) throw new ApiError("Product not found.", 404);
    return json({ product: updated[0] });
  }

  if (path === "/admin/products" && method === "POST") {
    await requireAdmin(db, request);
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
        id: crypto.randomUUID(), title, sku, price, stockQuantity: stock, status, category, imageUrl,
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
    await requireAdmin(db, request);
    const suppliers = await db
      .select(supplierColumns)
      .from(supplierIntegrations)
      .orderBy(asc(supplierIntegrations.name));
    return json({ suppliers });
  }

  if (path === "/admin/suppliers" && method === "PUT") {
    await requireAdmin(db, request);
    const body = await bodyAsJson(request);
    const name = requiredString(body.name, "Supplier name", 100);
    const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : crypto.randomUUID();
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
    const encryptedKey = apiKey ? await encryptSecret(apiKey, env.SUPPLIER_SECRET_ENCRYPTION_KEY) : null;
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
      .onConflictDoUpdate({
        target: supplierIntegrations.id,
        set: { ...values, updatedAt: sql`CURRENT_TIMESTAMP` },
      })
      .returning(supplierColumns);
    return json({ supplier: rows[0] }, 200);
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
    await requireAdmin(db, request);
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

export async function onRequest({ request, env }: PagesContext) {
  try {
    if (!env.DB) {
      throw new ApiError(
        "The Cloudflare Pages D1 binding DB is not configured. Connect the elovyn-store database to the DB binding and redeploy.",
        503,
      );
    }
    const db = createDb(env.DB);
    return await route(request, env, db);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error("Store API request failed:", error);
    return json({ error: "The request could not be completed. Check the Cloudflare Pages Function logs for details." }, 500);
  }
}
