import { and, eq, gt, sql } from "drizzle-orm";
import type { StoreDb } from "../../db";
import { sessions, users } from "../../db/schema";

const sessionLifetimeSeconds = 60 * 60 * 24 * 14;
const passwordIterations = 600_000;
export const primaryAdminEmail = "nsukumasaka@gmail.com";

export type StoreUser = {
  id: string;
  email: string;
  role: "customer" | "admin";
};

function randomToken(byteCount: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
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

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
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

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, passwordIterations);
  return `pbkdf2$${passwordIterations}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, iterationsText, saltHex, hashHex] = encoded.split("$");
  const iterations = Number(iterationsText);
  if (
    algorithm !== "pbkdf2" || !Number.isInteger(iterations) || iterations < 600_000 || iterations > 1_000_000
    || !/^[a-f\d]{32}$/i.test(saltHex ?? "") || !/^[a-f\d]{64}$/i.test(hashHex ?? "")
  ) return false;

  const actual = await derivePassword(password, hexToBytes(saltHex), iterations);
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
    .find((part) => part.startsWith("elovyn_session="))
    ?.slice("elovyn_session=".length);
  return token ? decodeURIComponent(token) : null;
}

export async function createSession(db: StoreDb, user: StoreUser) {
  const token = randomToken(32);
  await db.insert(sessions).values({
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
    .select({ id: users.id, email: users.email, role: users.role })
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
  return `elovyn_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function clearedSessionCookie(secure: string) {
  return `elovyn_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}
