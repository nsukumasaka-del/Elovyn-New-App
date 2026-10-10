export type StoreUser = { id: string; email: string; role: "customer" | "admin" };
export type CartProduct = { id: string; title: string; price: number; imageUrl: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

export { request as apiRequest };

export function isPrimaryAdmin(user: StoreUser | null) {
  return !!user
    && user.role === "admin"
    && user.email.trim().toLowerCase() === "nsukumasaka@gmail.com";
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
