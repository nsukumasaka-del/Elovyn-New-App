import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { isPrimaryAdmin } from "@/lib/store-api";

const navItems = [
  { label: "New Arrivals", href: "/categories/new-arrivals" },
  { label: "Streetwear", href: "/categories/streetwear" },
  { label: "T-Shirts", href: "/categories/t-shirts" },
  { label: "Hoodies", href: "/categories/hoodies" },
  { label: "Accessories", href: "/categories/accessories" },
];

const collectionSearchItems = [
  { title: "New Arrivals", href: "/categories/new-arrivals" },
  { title: "Streetwear", href: "/categories/streetwear" },
  { title: "T-Shirts", href: "/categories/t-shirts" },
  { title: "Hoodies", href: "/categories/hoodies" },
  { title: "Accessories", href: "/categories/accessories" },
  { title: "Wigs", href: "/categories/wigs" },
  { title: "Best Sellers", href: "/categories/best-sellers" },
];

function AuthDialog({ onClose }: { onClose: () => void }) {
  const { authMode, setAuthMode, signIn, signUp } = useStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (authMode === "signin") await signIn(email, password);
      else await signUp(email, password, fullName);
      onClose();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to complete sign in.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Your Elovyn account</p>
            <h2 id="auth-title" className="mt-2 text-3xl font-black tracking-tight">
              {authMode === "signin" ? "Welcome back." : "Create an account."}
            </h2>
          </div>
          <button type="button" aria-label="Close sign in" onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {authMode === "signup" && (
            <label className="block text-sm font-medium">
              Full name <span className="font-normal text-neutral-500">(optional)</span>
              <input
                autoComplete="name"
                maxLength={120}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            Email address
            <input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              autoComplete={authMode === "signin" ? "current-password" : "new-password"}
              minLength={authMode === "signup" ? 10 : undefined}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:border-neutral-950"
            />
            {authMode === "signup" && <span className="mt-1 block text-xs text-neutral-500">Use at least 10 characters.</span>}
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={submitting} type="submit" className="btn-primary w-full disabled:opacity-60">
            {submitting ? "Please wait…" : authMode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          <span>or</span>
          <span className="h-px flex-1 bg-neutral-200" />
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => window.location.assign("/api/auth/google")}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.91c-.58 2.96-2.26 5.48-4.77 7.18l7.73 6C44.38 37.96 46.98 31.8 46.98 24.55Z" />
            <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.94 23.94 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)" />
          </svg>
          Continue with Google
        </button>
        <button
          type="button"
          className="mt-5 w-full text-center text-sm text-neutral-600 hover:text-black"
          onClick={() => { setError(""); setAuthMode(authMode === "signin" ? "signup" : "signin"); }}
        >
          {authMode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </section>
    </div>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { cart, changeQuantity, removeFromCart, checkout, user, setAuthOpen } = useStore();
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function startCheckout() {
    setError("");
    setCheckoutLoading(true);
    try {
      await checkout();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not place the order.");
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your bag</h2>
            <p className="mt-1 text-sm text-neutral-500">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
          </div>
          <button type="button" aria-label="Close cart" onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6">
          {cart.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div><ShoppingBag className="mx-auto h-8 w-8 text-neutral-400" /><p className="mt-4 font-medium">Your bag is empty.</p><p className="mt-1 text-sm text-neutral-500">Find something you love.</p></div>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {cart.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  <img src={item.imageUrl} alt="" className="h-24 w-20 rounded-xl bg-neutral-100 object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="whitespace-nowrap text-sm font-medium">R {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">R {item.price.toFixed(2)} each</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="inline-flex items-center rounded-full border border-neutral-300">
                        <button aria-label={`Decrease ${item.title} quantity`} onClick={() => changeQuantity(item.id, item.quantity - 1)} className="px-3 py-1.5">−</button>
                        <span className="min-w-6 text-center text-sm">{item.quantity}</span>
                        <button aria-label={`Increase ${item.title} quantity`} onClick={() => changeQuantity(item.id, item.quantity + 1)} className="px-3 py-1.5">+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-xs text-neutral-500 underline hover:text-black">Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="border-t border-neutral-200 p-6">
          <div className="flex justify-between text-base font-semibold"><span>Subtotal</span><span>R {subtotal.toFixed(2)}</span></div>
          <p className="mt-2 text-xs text-neutral-500">Shipping and taxes are calculated at checkout.</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          {user ? (
            <button disabled={cart.length === 0 || checkoutLoading} onClick={() => void startCheckout()} className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50">
              {checkoutLoading ? "Opening Yoco…" : "Pay securely with Yoco"}
            </button>
          ) : (
            <button
              disabled={cart.length === 0}
              onClick={() => { onClose(); setAuthOpen(true); }}
              className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign in to continue
            </button>
          )}
          <p className="mt-3 text-center text-xs text-neutral-500">Secure test checkout powered by Yoco. No live payment will be collected.</p>
        </footer>
      </aside>
    </div>
  );
}

export const Header = () => {
  const {
    user, cart, wishlist, cartOpen, setCartOpen, authOpen, setAuthOpen,
    authMode, setAuthMode, signOut, products,
  } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const matches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const collections = collectionSearchItems
      .filter((item) => item.title.toLowerCase().includes(query))
      .map((item) => ({ ...item, kind: "collection" as const }));
    const productResults = products
      .filter((product) => product.title.toLowerCase().includes(query))
      .map((product) => ({ title: product.title, href: `/products/${product.id}`, kind: "product" as const }));
    return [...productResults, ...collections];
  }, [products, searchQuery]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className="sticky top-0 z-50">
        <div className="announcement-bar">
          <div className="section-shell flex h-9 items-center justify-center text-center text-[10px] font-medium uppercase tracking-[0.18em]">
            FREE DELIVERY ON ORDERS OVER R1,500
          </div>
        </div>
        <div className="store-header">
          <div className="header-left">
            <Link to="/" aria-label="Elovyn home" className="flex shrink-0 items-center gap-2.5">
              <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl bg-neutral-950 text-sm font-black tracking-tight text-white sm:h-12 sm:w-12">VL</span>
              <span className="hidden text-xs font-bold uppercase tracking-[0.22em] text-neutral-950 sm:block">Elovyn</span>
            </Link>
            <nav aria-label="Shop categories" className="header-nav">
              {navItems.map((item) => (
                <Link key={item.label} to={item.href} className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.13em] text-neutral-700 transition-colors hover:text-black">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="header-actions">
            <button aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)} className="header-icon">
              <Search className="h-5 w-5" />
            </button>
            <div className="relative hidden sm:block">
              <button
                aria-label="Account"
                aria-expanded={user ? profileOpen : authOpen}
                onClick={() => {
                  if (user) setProfileOpen((open) => !open);
                  else {
                    setAuthMode("signin");
                    setAuthOpen(true);
                  }
                }}
                className="header-icon"
              >
                <UserRound className="h-5 w-5" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
                  {user ? (
                    <>
                      <p className="truncate px-3 pt-2 text-sm font-semibold">{user.fullName || user.email}</p>
                      {user.fullName && <p className="truncate px-3 pb-2 text-xs text-neutral-500">{user.email}</p>}
                      <a href="/profile" className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-100">My Profile</a>
                      <a href="/orders" className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-100">Order History</a>
                      {isPrimaryAdmin(user) && <Link to="/admin" className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-100">Admin Console</Link>}
                      <button onClick={() => { setProfileOpen(false); void signOut().catch((error: Error) => toast.error(error.message)); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Sign Out</button>
                    </>
                  ) : (
                    <button onClick={() => { setAuthMode("signin"); setAuthOpen(true); setProfileOpen(false); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-neutral-100">Sign In / Sign Up</button>
                  )}
                </div>
              )}
            </div>
            <Link aria-label={`Wishlist, ${wishlist.length} saved items`} to="/wishlist" className="header-icon hidden sm:inline-flex">
              <Heart className="h-5 w-5" />
            </Link>
            <button aria-label={`Shopping bag, ${cartCount} items`} onClick={() => setCartOpen(true)} className="header-icon relative">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-950 px-1 text-[9px] font-medium text-white">{cartCount}</span>
            </button>
            <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="header-icon xl:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="absolute inset-x-0 top-full border-b border-neutral-200 bg-white px-4 py-4 shadow-lg">
            <label className="mx-auto flex max-w-3xl items-center gap-3 rounded-full border border-neutral-300 px-4">
              <Search className="h-4 w-4 text-neutral-500" />
              <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search collections…" className="h-12 flex-1 bg-transparent text-sm outline-none" />
              <button aria-label="Close search" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}><X className="h-4 w-4" /></button>
            </label>
            {matches.length > 0 && (
              <nav aria-label="Search results" className="mx-auto mt-3 max-w-3xl">
                {matches.map((item) => <Link key={`${item.kind}-${item.title}`} to={item.href} onClick={() => setSearchOpen(false)} className="flex items-center justify-between rounded-lg px-4 py-2 text-sm hover:bg-neutral-100"><span>{item.title}</span>{item.kind === "product" && <span className="text-xs text-neutral-400">Product</span>}</Link>)}
              </nav>
            )}
          </div>
        )}
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-[70] bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setMobileOpen(false)}>
            <motion.aside className="ml-auto flex h-full w-full max-w-sm flex-col bg-white p-6" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} onMouseDown={(event) => event.stopPropagation()}>
              <div className="mb-7 flex items-center justify-between">
                <Link to="/" aria-label="Elovyn home" className="grid h-12 w-12 place-items-center rounded-xl bg-neutral-950 text-sm font-black text-white">VL</Link>
                <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="rounded-full p-2 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => <Link key={item.label} to={item.href} onClick={() => setMobileOpen(false)} className="block border-b border-neutral-200 py-4 text-sm font-semibold uppercase tracking-widest">{item.label}</Link>)}
              </nav>
              <div className="mt-auto space-y-3">
                {user && (
                  <div className="rounded-xl bg-neutral-50 px-4 py-3">
                    <p className="truncate text-sm font-semibold">{user.fullName || user.email}</p>
                    {user.fullName && <p className="truncate text-xs text-neutral-500">{user.email}</p>}
                    <Link to="/profile" onClick={() => setMobileOpen(false)} className="mt-2 block text-sm underline">My Profile</Link>
                    <Link to="/orders" onClick={() => setMobileOpen(false)} className="mt-2 block text-sm underline">Order History</Link>
                  </div>
                )}
                {user && isPrimaryAdmin(user) && <Link to="/admin" onClick={() => setMobileOpen(false)} className="btn-secondary w-full">Admin Console</Link>}
                <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="btn-secondary w-full">Wishlist ({wishlist.length})</Link>
                {user ? (
                  <button onClick={() => { setMobileOpen(false); void signOut().catch((error: Error) => toast.error(error.message)); }} className="btn-primary w-full">Sign Out</button>
                ) : (
                  <button onClick={() => { setMobileOpen(false); setAuthOpen(true); }} className="btn-primary w-full">Sign In / Sign Up</button>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </>
  );
};
