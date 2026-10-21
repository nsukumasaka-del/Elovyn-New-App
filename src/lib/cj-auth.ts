import { SUPPLIER_AUTHENTICATION_ERROR } from "./supplier-validation";

export function cjAccessTokenFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { ok: false as const, error: SUPPLIER_AUTHENTICATION_ERROR };
  }
  const response = payload as { result?: boolean; success?: boolean; data?: { accessToken?: unknown } | null };
  const accessToken = response.data?.accessToken;
  if (response.result === false || response.success === false || typeof accessToken !== "string" || !accessToken.trim()) {
    return { ok: false as const, error: SUPPLIER_AUTHENTICATION_ERROR };
  }
  return { ok: true as const, accessToken: accessToken.trim() };
}

export function cjProductRecordsFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const content = (payload as { data?: { content?: unknown } }).data?.content;
  if (Array.isArray(content)) {
    return content.flatMap((group) => {
      if (!group || typeof group !== "object") return [];
      const products = (group as { productList?: unknown }).productList;
      return Array.isArray(products) ? products : [];
    });
  }
  if (content && typeof content === "object") {
    const products = (content as { productList?: unknown }).productList;
    return Array.isArray(products) ? products : null;
  }
  return null;
}
