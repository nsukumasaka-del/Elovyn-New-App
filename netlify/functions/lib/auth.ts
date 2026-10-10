import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
const sessionLifetimeSeconds = 60 * 60 * 24 * 14;
export const primaryAdminEmail = "nsukumasaka@gmail.com";

export type StoreUser = {
  id: string;
  email: string;
  role: "customer" | "admin";
};

function passwordHashParts(encoded: string) {
  const [algorithm, salt, digest] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !digest || !/^[a-f\d]{128}$/i.test(digest)) {
    throw new Error("ADMIN_PASSWORD_HASH must use the format scrypt$<salt>$<128-character-hex-digest>.");
  }
  return { salt, digest };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${digest.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const { salt, digest } = passwordHashParts(encoded);
  const expected = Buffer.from(digest, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}

function sessionDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
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

export async function createSession(user: StoreUser) {
  const token = randomBytes(32).toString("base64url");
  const db = getDb();
  await db`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${sessionDigest(token)}, ${user.id}, NOW() + INTERVAL '14 days')
  `;
  return {
    token,
    maxAge: sessionLifetimeSeconds,
  };
}

export async function getSessionUser(request: Request): Promise<StoreUser | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const db = getDb();
  const rows = await db<StoreUser[]>`
    SELECT users.id, users.email, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${sessionDigest(token)}
      AND sessions.expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function deleteSession(request: Request) {
  const token = readSessionToken(request);
  if (!token) return;
  const db = getDb();
  await db`DELETE FROM sessions WHERE token_hash = ${sessionDigest(token)}`;
}

export function sessionCookie(token: string, maxAge: number) {
  const secure = process.env.CONTEXT === "production" || process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `elovyn_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function clearedSessionCookie() {
  const secure = process.env.CONTEXT === "production" || process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `elovyn_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}
