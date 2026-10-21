const blockedStoreHosts = new Set(["elovyn.store", "www.elovyn.store", "elovyn-new-app.pages.dev"]);

function isPrivateHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
}

export function isElovynStoreHost(hostname: string, currentStoreHost = "") {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const current = currentStoreHost.toLowerCase().replace(/\.$/, "");
  return Boolean(current && host === current)
    || blockedStoreHosts.has(host)
    || host.endsWith(".elovyn.store")
    || host.endsWith(".elovyn-new-app.pages.dev");
}

export function supplierUrlValidationError(value: string, currentStoreHost = "") {
  let url: URL;
  try { url = new URL(value); }
  catch { return "Supplier feed URL must be a valid HTTPS URL."; }
  if (url.protocol !== "https:") return "Supplier feed URL must use HTTPS.";
  if (isPrivateHost(url.hostname)) return "Supplier feed URL must be a public internet endpoint.";
  if (isElovynStoreHost(url.hostname, currentStoreHost)) {
    return "Supplier feed URL cannot point to the Elovyn storefront or admin. Enter the supplier's direct API or JSON feed URL.";
  }
  return null;
}

export async function readSupplierJsonResponse(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return { ok: false as const, error: "Authentication failed: Please check that your API key is correct and active." };
  }
  if (!response.ok) {
    return { ok: false as const, error: `Supplier returned HTTP ${response.status}. Check the URL and credentials.` };
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json")) {
    return { ok: false as const, error: `Supplier returned ${contentType || "an unknown content type"} instead of JSON. Make sure the URL points directly to a JSON feed or API endpoint, not a web page.` };
  }
  try {
    return { ok: true as const, payload: await response.json() as unknown };
  } catch {
    return { ok: false as const, error: "Supplier returned malformed JSON. Ask the supplier to verify the feed response." };
  }
}
