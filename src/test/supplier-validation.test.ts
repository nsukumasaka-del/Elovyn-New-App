import { describe, expect, it } from "vitest";
import { readSupplierJsonResponse, supplierUrlValidationError } from "@/lib/supplier-validation";

describe("supplier feed safeguards", () => {
  it("rejects storefront, admin, insecure, and private feed URLs", () => {
    expect(supplierUrlValidationError("https://elovyn.store/admin")).toMatch(/cannot point/i);
    expect(supplierUrlValidationError("https://preview.elovyn-new-app.pages.dev/api/products")).toMatch(/cannot point/i);
    expect(supplierUrlValidationError("https://shop.example/feed", "shop.example")).toMatch(/cannot point/i);
    expect(supplierUrlValidationError("http://supplier.example/feed.json")).toMatch(/HTTPS/i);
    expect(supplierUrlValidationError("https://127.0.0.1/feed.json")).toMatch(/public/i);
    expect(supplierUrlValidationError("https://supplier.example/feed.json")).toBeNull();
  });

  it("does not parse HTML or unsuccessful responses as JSON", async () => {
    const html = await readSupplierJsonResponse(new Response("<!doctype html>", { status: 200, headers: { "Content-Type": "text/html" } }));
    expect(html).toEqual(expect.objectContaining({ ok: false, error: expect.stringMatching(/instead of JSON/i) }));

    const missing = await readSupplierJsonResponse(new Response("not found", { status: 404, headers: { "Content-Type": "text/html" } }));
    expect(missing).toEqual(expect.objectContaining({ ok: false, error: expect.stringMatching(/HTTP 404/i) }));

    for (const status of [401, 403]) {
      const authentication = await readSupplierJsonResponse(new Response("unauthorized", { status, headers: { "Content-Type": "text/html" } }));
      expect(authentication).toEqual({ ok: false, error: "Authentication failed: Please check that your API key is correct and active." });
    }
  });

  it("reports malformed declared JSON and accepts valid JSON", async () => {
    const malformed = await readSupplierJsonResponse(new Response("{broken", { headers: { "Content-Type": "application/json" } }));
    expect(malformed).toEqual(expect.objectContaining({ ok: false, error: expect.stringMatching(/malformed JSON/i) }));

    const valid = await readSupplierJsonResponse(new Response('{"products":[]}', { headers: { "Content-Type": "application/json; charset=utf-8" } }));
    expect(valid).toEqual({ ok: true, payload: { products: [] } });
  });
});
