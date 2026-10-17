import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../functions/lib/auth";

describe("Cloudflare-compatible password hashing", () => {
  it("creates verifiable hashes without exceeding the Web Crypto iteration limit", async () => {
    const password = "correct horse battery staple";
    const encoded = await hashPassword(password);

    expect(encoded).toMatch(/^pbkdf2-chain\$100000\$6\$/);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword("incorrect password", encoded)).resolves.toBe(false);
  }, 30_000);

  it("rejects legacy hashes that request unsupported iteration counts", async () => {
    const legacyHash = `pbkdf2$600000$${"a".repeat(32)}$${"b".repeat(64)}`;

    await expect(verifyPassword("password", legacyHash)).resolves.toBe(false);
  });
});
