export type StoreUser = {
  id: string;
  email: string;
  role: "customer" | "admin";
  fullName: string | null;
};
export type CartProduct = { id: string; title: string; price: number; imageUrl: string; quantity?: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? ` (${error.message})` : "";
    throw new Error(`Could not reach the store API. Check your connection and the Cloudflare Pages deployment${reason}`);
  }

  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    if (response.status === 404 || response.headers.get("content-type")?.includes("text/html")) {
      throw new Error(`Store API route is unavailable (HTTP ${response.status}). Check the Cloudflare Pages Function deployment.`);
    }
    throw new Error(`Store API returned an unexpected response (HTTP ${response.status}).`);
  }

  let data: T & { error?: string };
  try {
    data = await response.json() as T & { error?: string };
  } catch {
    throw new Error("Store API returned invalid JSON.");
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

export { request as apiRequest };

export function isPrimaryAdmin(user: StoreUser | null) {
  return user?.role === "admin";
}

export function readSavedProduct(id: string): CartProduct | null {
  try {
    const value = localStorage.getItem(`elovyn-product:${id}`);
    if (!value) return null;
    const product: unknown = JSON.parse(value);
    if (!product || typeof product !== "object") return null;
    const candidate = product as Partial<CartProduct>;
    if (
      candidate.id !== id || typeof candidate.title !== "string"
      || !Number.isFinite(candidate.price) || typeof candidate.imageUrl !== "string"
    ) return null;
    return candidate as CartProduct;
  } catch {
    return null;
  }
}
