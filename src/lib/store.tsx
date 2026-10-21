import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { apiRequest as request, type CartProduct, type StoreUser } from "@/lib/store-api";
import type { DeliveryAddress } from "@/lib/delivery-address";

export type { CartProduct, StoreUser } from "@/lib/store-api";
export type { DeliveryAddress } from "@/lib/delivery-address";
export type CartLine = CartProduct & { quantity: number };
export type StoreProduct = {
  id: string;
  title: string;
  price: number | string;
  stock_quantity: number;
  category: string | null;
  image_url: string | null;
};

type StoreContextValue = {
  user: StoreUser | null;
  ready: boolean;
  connectionError: string | null;
  retryConnection: () => void;
  products: StoreProduct[];
  refreshProducts: () => Promise<void>;
  cart: CartLine[];
  wishlist: string[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  authMode: "signin" | "signup";
  setAuthMode: (mode: "signin" | "signup") => void;
  addToCart: (product: CartProduct) => void;
  changeQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleWishlist: (id: string, product: CartProduct) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkout: (deliveryAddress: DeliveryAddress) => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const cartStorageKey = "elovyn-cart";
const wishlistStorageKey = "elovyn-wishlist";

function readStoredCart(): CartLine[] {
  try {
    const value = localStorage.getItem(cartStorageKey);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartLine =>
      !!item && typeof item.id === "string"
      && typeof item.title === "string" && Number.isFinite(item.price)
      && Number.isInteger(item.quantity) && item.quantity > 0
      && typeof item.imageUrl === "string",
    );
  } catch {
    return [];
  }
}

function readWishlist(): string[] {
  try {
    const value = localStorage.getItem(wishlistStorageKey);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoreUser | null>(null);
  const [ready, setReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [cart, setCart] = useState<CartLine[]>(readStoredCart);
  const [wishlist, setWishlist] = useState<string[]>(readWishlist);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const persistCart = useCallback((next: CartLine[]) => {
    setCart(next);
    localStorage.setItem(cartStorageKey, JSON.stringify(next));
    if (user) {
      void request<{ cart: { id: string; quantity: number }[] }>("/cart", {
        method: "PUT",
        body: JSON.stringify({ cart: next.map(({ id, quantity }) => ({ id, quantity })) }),
      }).catch((error: Error) => toast.error(`Could not sync your cart: ${error.message}`));
    }
  }, [user]);

  const retryConnection = useCallback(() => {
    setReady(false);
    setRetryCount((count) => count + 1);
  }, []);

  const refreshProducts = useCallback(async () => {
    const catalog = await request<{ products: StoreProduct[] }>("/products");
    setProducts(catalog.products);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setConnectionError(null);
    request<{ user: StoreUser | null }>("/auth/me")
      .then(async ({ user: currentUser }) => {
        if (cancelled) return;
        setUser(currentUser);
        const catalog = await request<{ products: StoreProduct[] }>("/products");
        if (cancelled) return;
        setProducts(catalog.products);
        if (currentUser) {
          const saved = await request<{ cart: { id: string; quantity: number }[] }>("/cart");
          if (cancelled) return;
          const local = readStoredCart();
          const storedQuantities = new Map(saved.cart.map((item) => [item.id, item.quantity]));
          const merged = local.map((item) => ({
            ...item,
            quantity: storedQuantities.get(item.id) ?? item.quantity,
          }));
          for (const item of saved.cart) {
            if (!merged.some((localItem) => localItem.id === item.id)) {
              const stored = localStorage.getItem(`${cartStorageKey}:${item.id}`);
              if (stored) {
                const product = JSON.parse(stored) as CartProduct;
                merged.push({ ...product, quantity: item.quantity });
              }
            }
          }
          setCart(merged);
          localStorage.setItem(cartStorageKey, JSON.stringify(merged));
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setConnectionError(error.message);
      })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [retryCount]);

  const addToCart = useCallback((product: CartProduct) => {
    const requestedQuantity = product.quantity ?? 1;
    const quantity = Number.isInteger(requestedQuantity)
      ? Math.max(1, Math.min(99, requestedQuantity))
      : 1;
    const cartProduct = { ...product };
    delete cartProduct.quantity;
    const current = readStoredCart();
    const existing = current.find((item) => item.id === product.id);
    const next = existing
      ? current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item)
      : [...current, { ...cartProduct, quantity }];
    localStorage.setItem(`${cartStorageKey}:${product.id}`, JSON.stringify(cartProduct));
    persistCart(next);
    toast.success(`${product.title} added to your bag`);
  }, [persistCart]);

  const changeQuantity = useCallback((id: string, quantity: number) => {
    persistCart(cart
      .map((item) => item.id === id ? { ...item, quantity: Math.max(0, Math.min(99, quantity)) } : item)
      .filter((item) => item.quantity > 0));
  }, [cart, persistCart]);

  const removeFromCart = useCallback((id: string) => {
    persistCart(cart.filter((item) => item.id !== id));
  }, [cart, persistCart]);

  const clearCart = useCallback(() => persistCart([]), [persistCart]);

  const toggleWishlist = useCallback((id: string, product: CartProduct) => {
    localStorage.setItem(`elovyn-product:${id}`, JSON.stringify(product));
    setWishlist((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      localStorage.setItem(wishlistStorageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const establishSession = useCallback(async (
    path: string,
    email: string,
    password: string,
    fullName?: string,
  ) => {
    const result = await request<{ user: StoreUser; welcomeEmailSent?: boolean }>(path, {
      method: "POST",
      body: JSON.stringify({ email, password, ...(fullName ? { fullName } : {}) }),
    });
    setUser(result.user);
    setAuthOpen(false);
    const isSignUp = path.endsWith("register") || path.endsWith("signup");
    if (isSignUp && result.welcomeEmailSent === false) {
      toast.error("Your account was created, but we could not send the welcome email.");
    } else {
      toast.success(isSignUp ? "Your account is ready." : "Welcome back.");
    }
    try {
      const currentCart = readStoredCart();
      const savedCart = await request<{ cart: { id: string; quantity: number }[] }>("/cart");
      const quantities = new Map(savedCart.cart.map((item) => [item.id, item.quantity]));
      const mergedCart = currentCart.map((item) => ({
        ...item,
        quantity: Math.min(99, item.quantity + (quantities.get(item.id) ?? 0)),
      }));
      for (const item of savedCart.cart) {
        if (mergedCart.some((entry) => entry.id === item.id)) continue;
        const stored = localStorage.getItem(`${cartStorageKey}:${item.id}`);
        if (stored) mergedCart.push({ ...(JSON.parse(stored) as CartProduct), quantity: item.quantity });
      }
      setCart(mergedCart);
      localStorage.setItem(cartStorageKey, JSON.stringify(mergedCart));
      await request("/cart", {
        method: "PUT",
        body: JSON.stringify({ cart: mergedCart.map(({ id, quantity }) => ({ id, quantity })) }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The saved cart could not be synchronized.";
      toast.error(`You are signed in, but your saved cart could not be synchronized: ${message}`);
    }
  }, []);

  const signIn = useCallback((email: string, password: string) => (
    establishSession("/auth/login", email, password)
  ), [establishSession]);

  const signUp = useCallback((email: string, password: string, fullName: string) => (
    establishSession("/auth/signup", email, password, fullName)
  ), [establishSession]);

  const signOut = useCallback(async () => {
    await request("/auth/signout", { method: "POST" });
    setUser(null);
    toast.success("You have signed out.");
  }, []);

  const checkout = useCallback(async (deliveryAddress: DeliveryAddress) => {
    if (!user) {
      setAuthMode("signin");
      setAuthOpen(true);
      toast.message("Sign in to place your order.");
      return;
    }
    const result = await request<{ redirect_url: string }>("/orders", {
      method: "POST",
      body: JSON.stringify({ items: cart.map(({ id, quantity }) => ({ id, quantity })), delivery_address: deliveryAddress }),
    });
    window.location.assign(result.redirect_url);
  }, [cart, user]);

  const value = useMemo(() => ({
    user, ready, connectionError, retryConnection, products, refreshProducts, cart, wishlist, cartOpen, setCartOpen, authOpen, setAuthOpen,
    authMode, setAuthMode, addToCart, changeQuantity, removeFromCart, clearCart,
    toggleWishlist, signIn, signUp, signOut, checkout,
  }), [
    user, ready, connectionError, retryConnection, products, refreshProducts, cart, wishlist, cartOpen, authOpen, authMode, addToCart,
    changeQuantity, removeFromCart, clearCart, toggleWishlist, signIn, signUp, signOut, checkout,
  ]);

  return (
    <StoreContext.Provider value={value}>
      {connectionError && (
        <div role="alert" className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-4 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-md">
          <p><strong>Store connection unavailable.</strong> {connectionError}</p>
          <button
            type="button"
            onClick={retryConnection}
            disabled={!ready}
            className="shrink-0 rounded-full border border-red-300 px-3 py-1 font-medium hover:bg-red-100 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider.");
  return value;
}
