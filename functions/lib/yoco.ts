const yocoApiBase = "https://payments.yoco.com/api";

type Fetcher = typeof fetch;

export function normalizeYocoSecretKey(mode: "live" | "test", value: string | undefined) {
  const secretKey = value?.trim() ?? "";
  const prefix = mode === "test" ? "sk_test_" : "sk_live_";
  if (!secretKey) throw new Error(`Yoco ${mode} secret key is not configured.`);
  if (!secretKey.startsWith(prefix)) {
    throw new Error(`Yoco ${mode} secret key must start with ${prefix}.`);
  }
  return secretKey;
}

async function yocoJson(response: Response) {
  const responseBody = await response.text();
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json")) {
    console.error("Yoco API returned a non-JSON response.", {
      status: response.status,
      url: response.url,
      body: responseBody,
    });
    throw new Error(`Yoco returned an unexpected response (HTTP ${response.status}).`);
  }
  let payload: unknown;
  try { payload = JSON.parse(responseBody) as unknown; }
  catch {
    console.error("Yoco API returned invalid JSON.", {
      status: response.status,
      url: response.url,
      body: responseBody,
    });
    throw new Error("Yoco returned an invalid JSON response.");
  }
  if (!response.ok) {
    console.error("Yoco API request failed.", {
      status: response.status,
      url: response.url,
      body: responseBody,
    });
    const message = payload && typeof payload === "object"
      ? String((payload as { message?: unknown; error?: unknown }).message || (payload as { error?: unknown }).error || "")
      : "";
    throw new Error(message ? `Yoco rejected the request: ${message}` : `Yoco rejected the request (HTTP ${response.status}).`);
  }
  return payload;
}

export type YocoCheckoutRequest = {
  amount: number;
  currency: "ZAR";
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  metadata: Record<string, string>;
  externalId: string;
  clientReferenceId: string;
};

export async function createYocoCheckout(secretKey: string, checkout: YocoCheckoutRequest, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${yocoApiBase}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": checkout.externalId,
    },
    body: JSON.stringify(checkout),
  });
  const payload = await yocoJson(response);
  if (!payload || typeof payload !== "object") throw new Error("Yoco returned an incomplete checkout response.");
  const result = payload as { id?: unknown; redirectUrl?: unknown; processingMode?: unknown };
  if (typeof result.id !== "string" || typeof result.redirectUrl !== "string") {
    throw new Error("Yoco returned an incomplete checkout response.");
  }
  const redirect = new URL(result.redirectUrl);
  if (redirect.protocol !== "https:" || !(redirect.hostname === "c.yoco.com" || redirect.hostname.endsWith(".yoco.com"))) {
    throw new Error("Yoco returned an invalid checkout redirect URL.");
  }
  return {
    id: result.id,
    redirectUrl: redirect.toString(),
    ...(typeof result.processingMode === "string" ? { processingMode: result.processingMode } : {}),
  };
}

export async function getYocoCheckout(secretKey: string, checkoutId: string, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${yocoApiBase}/checkouts/${encodeURIComponent(checkoutId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const payload = await yocoJson(response);
  if (!payload || typeof payload !== "object") throw new Error("Yoco returned an incomplete checkout response.");
  return payload as { id?: string; status?: string; paymentId?: string; amount?: number; currency?: string };
}

export async function registerYocoWebhook(secretKey: string, url: string, fetcher: Fetcher = fetch) {
  const response = await fetcher(`${yocoApiBase}/webhooks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Elovyn payments", url }),
  });
  const payload = await yocoJson(response);
  if (!payload || typeof payload !== "object") throw new Error("Yoco returned an incomplete webhook response.");
  const result = payload as { id?: unknown; secret?: unknown; mode?: unknown };
  if (typeof result.id !== "string" || typeof result.secret !== "string" || !result.secret.startsWith("whsec_")) {
    throw new Error("Yoco returned an incomplete webhook response.");
  }
  return { id: result.id, secret: result.secret, mode: typeof result.mode === "string" ? result.mode : "test" };
}

function decodeBase64(value: string) {
  try { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }
  catch { return null; }
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function verifyYocoWebhookSignature(input: {
  secret: string;
  webhookId: string;
  timestamp: string;
  signature: string;
  rawBody: string;
  now?: number;
}) {
  const timestamp = Number(input.timestamp);
  const now = input.now ?? Date.now();
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp * 1000) > 180_000) return false;
  const secretBytes = input.secret.startsWith("whsec_") ? decodeBase64(input.secret.slice(6)) : null;
  if (!secretBytes) return false;
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${input.webhookId}.${input.timestamp}.${input.rawBody}`)));
  return input.signature.split(/\s+/).some((candidate) => {
    const [version, encoded] = candidate.split(",", 2);
    const actual = version === "v1" && encoded ? decodeBase64(encoded) : null;
    return actual ? constantTimeEqual(expected, actual) : false;
  });
}
