import { and, eq, gt, sql } from "drizzle-orm";
import type { StoreDb } from "../../db";
import { sessions, users } from "../../db/schema";

const sessionLifetimeSeconds = 60 * 60 * 24 * 14;
const passwordIterationsPerRound = 100_000;
const passwordHashRounds = 6;
export const primaryAdminEmail = "nsukumasaka@gmail.com";

export type StoreUser = {
  id: string;
  email: string;
  role: "customer" | "admin";
  fullName: string | null;
  deliveryAddressJson: string | null;
};

const sessionCookieName = "elovyn_session";
const oauthStateCookieName = "elovyn_oauth_state";

function randomToken(byteCount: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(bytes));
}

async function derivePassword(password: string | Uint8Array, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    typeof password === "string" ? new TextEncoder().encode(password) : password,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    256,
  );
  return new Uint8Array(bits);
}

async function deriveChainedPassword(password: string, salt: Uint8Array, iterations: number, rounds: number) {
  let derived = await derivePassword(password, salt, iterations);
  for (let round = 1; round < rounds; round += 1) {
    derived = await derivePassword(derived, salt, iterations);
  }
  return derived;
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveChainedPassword(
    password,
    salt,
    passwordIterationsPerRound,
    passwordHashRounds,
  );
  return `pbkdf2-chain$${passwordIterationsPerRound}$${passwordHashRounds}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split("$");
  const algorithm = parts[0];
  const iterations = Number(parts[1]);
  const chained = algorithm === "pbkdf2-chain";
  const rounds = chained ? Number(parts[2]) : 1;
  const saltHex = chained ? parts[3] : parts[2];
  const hashHex = chained ? parts[4] : parts[3];
  if (
    (algorithm !== "pbkdf2" && !chained)
    || !Number.isInteger(iterations) || iterations !== passwordIterationsPerRound
    || !Number.isInteger(rounds) || rounds !== (chained ? passwordHashRounds : 1)
    || !/^[a-f\d]{32}$/i.test(saltHex ?? "") || !/^[a-f\d]{64}$/i.test(hashHex ?? "")
  ) return false;

  const salt = hexToBytes(saltHex);
  const actual = chained
    ? await deriveChainedPassword(password, salt, iterations, rounds)
    : await derivePassword(password, salt, iterations);
  const expected = hexToBytes(hashHex);
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export function readSessionToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`))
    ?.slice(sessionCookieName.length + 1);
  if (!token) return null;
  try {
    return decodeURIComponent(token);
  } catch {
    return null;
  }
}

export async function createSession(db: StoreDb, user: StoreUser) {
  const token = randomToken(32);
  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    tokenHash: await digest(token),
    userId: user.id,
    expiresAt: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds,
  });
  return { token, maxAge: sessionLifetimeSeconds };
}

export async function getSessionUser(db: StoreDb, request: Request): Promise<StoreUser | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const tokenHash = await digest(token);
  const rows = await db
    .select({ id: users.id, email: users.email, role: users.role, fullName: users.fullName, deliveryAddressJson: users.deliveryAddressJson })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, sql`unixepoch()`)))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteSession(db: StoreDb, request: Request) {
  const token = readSessionToken(request);
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, await digest(token)));
}

export function sessionCookie(token: string, maxAge: number, secure: string) {
  return `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function clearedSessionCookie(secure: string) {
  return `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

async function signOAuthState(state: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(state));
  return base64Url(new Uint8Array(signature));
}

export async function createOAuthState(state: string, secret: string) {
  return `${state}.${await signOAuthState(state, secret)}`;
}

export async function verifyOAuthState(state: string, cookie: string | null, secret: string) {
  if (!cookie) return false;
  const separator = cookie.lastIndexOf(".");
  if (separator < 1 || cookie.slice(0, separator) !== state) return false;
  const expected = await signOAuthState(state, secret);
  const actual = cookie.slice(separator + 1);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  }
  return difference === 0;
}

export function readOAuthStateCookie(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${oauthStateCookieName}=`))
    ?.slice(oauthStateCookieName.length + 1);
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function oauthStateCookie(value: string, secure: string) {
  return `${oauthStateCookieName}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/api/auth/callback/google; Max-Age=600${secure}`;
}

export function clearedOAuthStateCookie(secure: string) {
  return `${oauthStateCookieName}=; HttpOnly; SameSite=Lax; Path=/api/auth/callback/google; Max-Age=0${secure}`;
}
