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

export type { CartProduct, StoreUser } from "@/lib/store-api";
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
  products: StoreProduct[];
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
  toggleWishlist: (id: string, product: CartProduct) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkout: () => Promise<void>;
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

  useEffect(() => {
    let cancelled = false;
    request<{ user: StoreUser | null }>("/auth/session")
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
      .catch((error: Error) => toast.error(`Store connection unavailable: ${error.message}`))
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const addToCart = useCallback((product: CartProduct) => {
    const current = readStoredCart();
    const existing = current.find((item) => item.id === product.id);
    const next = existing
      ? current.map((item) => item.id === product.id ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item)
      : [...current, { ...product, quantity: 1 }];
    localStorage.setItem(`${cartStorageKey}:${product.id}`, JSON.stringify(product));
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

  const toggleWishlist = useCallback((id: string, product: CartProduct) => {
    localStorage.setItem(`elovyn-product:${id}`, JSON.stringify(product));
    setWishlist((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      localStorage.setItem(wishlistStorageKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const establishSession = useCallback(async (path: string, email: string, password: string) => {
    const result = await request<{ user: StoreUser }>(path, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(result.user);
    setAuthOpen(false);
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
    toast.success(path.endsWith("register") ? "Your account is ready." : "Welcome back.");
  }, []);

  const signIn = useCallback((email: string, password: string) => (
    establishSession("/auth/login", email, password)
  ), [establishSession]);

  const signUp = useCallback((email: string, password: string) => (
    establishSession("/auth/register", email, password)
  ), [establishSession]);

  const signOut = useCallback(async () => {
    await request("/auth/logout", { method: "POST" });
    setUser(null);
    toast.success("You have signed out.");
  }, []);

  const checkout = useCallback(async () => {
    if (!user) {
      setAuthMode("signin");
      setAuthOpen(true);
      toast.message("Sign in to place your order.");
      return;
    }
    await request("/orders", {
      method: "POST",
      body: JSON.stringify({ items: cart.map(({ id, quantity }) => ({ id, quantity })) }),
    });
  }, [cart, user]);

  const value = useMemo(() => ({
    user, ready, products, cart, wishlist, cartOpen, setCartOpen, authOpen, setAuthOpen,
    authMode, setAuthMode, addToCart, changeQuantity, removeFromCart,
    toggleWishlist, signIn, signUp, signOut, checkout,
  }), [
    user, ready, products, cart, wishlist, cartOpen, authOpen, authMode, addToCart,
    changeQuantity, removeFromCart, toggleWishlist, signIn, signUp, signOut, checkout,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider.");
  return value;
}
