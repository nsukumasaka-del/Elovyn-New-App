import { describe, expect, it, vi } from "vitest";
import { createYocoCheckout, verifyYocoWebhookSignature } from "../../functions/lib/yoco";

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

describe("Yoco payment integration", () => {
  it("creates a server-side checkout with bearer auth and idempotency", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify({
      id: "ch_test",
      redirectUrl: "https://c.yoco.com/checkout/test",
      processingMode: "test",
    }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;
    const checkout = await createYocoCheckout("sk_test", {
      amount: 12500,
      currency: "ZAR",
      successUrl: "https://elovyn.store/payment/success",
      cancelUrl: "https://elovyn.store/payment/cancelled",
      failureUrl: "https://elovyn.store/payment/failed",
      metadata: { orderId: "order-1" },
      externalId: "order-1",
      clientReferenceId: "order-1",
    }, fetcher);
    expect(checkout.redirectUrl).toBe("https://c.yoco.com/checkout/test");
    expect(fetcher).toHaveBeenCalledWith("https://payments.yoco.com/api/checkouts", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer sk_test", "Idempotency-Key": "order-1" }),
    }));
  });

  it("rejects non-JSON checkout responses", async () => {
    const fetcher = vi.fn(async () => new Response("<!doctype html>", { status: 502, headers: { "Content-Type": "text/html" } })) as typeof fetch;
    await expect(createYocoCheckout("sk_test", {
      amount: 100,
      currency: "ZAR",
      successUrl: "https://elovyn.store/payment/success",
      cancelUrl: "https://elovyn.store/payment/cancelled",
      failureUrl: "https://elovyn.store/payment/failed",
      metadata: { orderId: "order-1" },
      externalId: "order-1",
      clientReferenceId: "order-1",
    }, fetcher)).rejects.toThrow(/unexpected response/i);
  });

  it("verifies signed current webhooks and rejects stale events", async () => {
    const rawBody = '{"type":"payment.succeeded"}';
    const secretBytes = crypto.getRandomValues(new Uint8Array(32));
    const secret = `whsec_${bytesToBase64(secretBytes)}`;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = bytesToBase64(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`evt-1.${timestamp}.${rawBody}`))));
    expect(await verifyYocoWebhookSignature({ secret, webhookId: "evt-1", timestamp, signature: `v1,${signature}`, rawBody })).toBe(true);
    expect(await verifyYocoWebhookSignature({ secret, webhookId: "evt-1", timestamp, signature: `v1,${signature}`, rawBody, now: Date.now() + 181_000 })).toBe(false);
  });
});
