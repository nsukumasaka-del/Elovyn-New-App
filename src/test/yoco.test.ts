import { describe, expect, it, vi } from "vitest";
import { createYocoCheckout, normalizeYocoSecretKey, verifyYocoWebhookSignature } from "../../functions/lib/yoco";

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

describe("Yoco payment integration", () => {
  it("creates a server-side checkout with bearer auth and idempotency", async () => {
    let sentRequestBody: BodyInit | null | undefined;
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      sentRequestBody = init?.body;
      return new Response(JSON.stringify({
        id: "ch_test",
        redirectUrl: "https://c.yoco.com/checkout/test",
        processingMode: "test",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
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
    const requestBody = JSON.parse(String(sentRequestBody)) as Record<string, unknown>;
    expect(requestBody).toMatchObject({
      amount: 12500,
      currency: "ZAR",
      successUrl: "https://elovyn.store/payment/success",
      metadata: { orderId: "order-1" },
    });
  });

  it("trims mode-specific secret keys and rejects a mismatched key mode", () => {
    expect(normalizeYocoSecretKey("test", " \nsk_test_example \n")).toBe("sk_test_example");
    expect(normalizeYocoSecretKey("live", "\tsk_live_example")).toBe("sk_live_example");
    expect(() => normalizeYocoSecretKey("live", "sk_test_example")).toThrow(/must start with sk_live_/);
  });

  it("logs Yoco HTTP status and exact response body on API failures", async () => {
    const errorBody = JSON.stringify({ error: "invalid_key", message: "Secret key is invalid" });
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn(async () => new Response(errorBody, {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
    await expect(createYocoCheckout("sk_test_example", {
      amount: 100,
      currency: "ZAR",
      successUrl: "https://elovyn.store/payment/success",
      cancelUrl: "https://elovyn.store/payment/cancelled",
      failureUrl: "https://elovyn.store/payment/failed",
      metadata: { orderId: "order-1" },
      externalId: "order-1",
      clientReferenceId: "order-1",
    }, fetcher)).rejects.toThrow(/Yoco rejected the request/);
    expect(logError).toHaveBeenCalledWith("Yoco API request failed.", expect.objectContaining({
      status: 401,
      body: errorBody,
    }));
    logError.mockRestore();
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
