import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { apiRequest, readSavedProduct, type CartProduct } from "@/lib/store-api";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export function WishlistPage() {
  const { wishlist, addToCart, toggleWishlist } = useStore();
  const products = wishlist.map(readSavedProduct).filter((product): product is CartProduct => product !== null);
  return (
    <div className="min-h-screen bg-[#f6f1ea]">
      <Header />
      <main className="section-shell min-h-[55vh] py-14 sm:py-20">
        <p className="eyebrow">Your collection</p>
        <h1 className="section-heading mt-3">Saved items</h1>
        {products.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-neutral-200 bg-white p-10 text-center">
            <p className="text-lg font-semibold">No saved items yet.</p>
            <Link to="/#new-arrivals" className="btn-primary mt-5">Explore new arrivals</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <article key={product.id} className="product-card overflow-hidden">
                <img src={product.imageUrl} alt={product.title} className="aspect-[4/5] w-full object-cover" />
                <div className="space-y-3 p-5">
                  <h2 className="font-semibold">{product.title}</h2>
                  <p className="text-sm">R {product.price.toFixed(2)}</p>
                  <button className="btn-secondary w-full" onClick={() => addToCart(product)}>Add to bag</button>
                  <button className="w-full py-2 text-sm text-neutral-500 underline" onClick={() => toggleWishlist(product.id, product)}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export function AccountPage() {
  const { user, ready, setAuthOpen } = useStore();
  if (ready && !user) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-[#f6f1ea]">
      <Header />
      <main className="section-shell min-h-[55vh] py-14 sm:py-20">
        <p className="eyebrow">Account</p>
        <h1 className="section-heading mt-3">My profile</h1>
        {user ? (
          <section className="mt-8 max-w-xl rounded-3xl border border-neutral-200 bg-white p-7">
            <p className="text-sm text-neutral-500">Signed in as</p>
            <p className="mt-1 text-lg font-semibold">{user.email}</p>
            <Link to="/orders" className="btn-secondary mt-6">View order history</Link>
          </section>
        ) : (
          <div className="mt-8"><p>Loading your profile…</p><button onClick={() => setAuthOpen(true)} className="btn-primary mt-4">Sign in</button></div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export function LoginPage() {
  const { user, ready, setAuthOpen, setAuthMode } = useStore();
  useEffect(() => {
    if (ready && !user) {
      setAuthMode("signin");
      setAuthOpen(true);
    }
  }, [ready, user, setAuthMode, setAuthOpen]);
  if (ready && user) return <Navigate to={user.role === "admin" ? "/admin" : "/profile"} replace />;
  return (
    <div className="min-h-screen bg-[#f6f1ea]">
      <Header />
      <main className="section-shell grid min-h-[55vh] place-items-center py-14">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold">Sign in to Elovyn</h1>
          <button onClick={() => setAuthOpen(true)} className="btn-primary mt-5">Open sign in</button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

type Order = {
  id: string;
  total_amount: number | string;
  status: string;
  items_json: string;
  created_at: string;
};

export function OrdersPage() {
  const { user, ready } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiRequest<{ orders: Order[] }>("/orders")
      .then(({ orders: rows }) => setOrders(rows))
      .catch((error: Error) => toast.error(`Could not load orders: ${error.message}`))
      .finally(() => setLoading(false));
  }, [user]);

  if (ready && !user) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-[#f6f1ea]">
      <Header />
      <main className="section-shell min-h-[55vh] py-14 sm:py-20">
        <p className="eyebrow">Your account</p>
        <h1 className="section-heading mt-3">Order history</h1>
        {loading ? <p className="mt-8 text-neutral-500">Loading orders…</p> : orders.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8">
            <p className="font-semibold">No orders yet.</p>
            <Link to="/#new-arrivals" className="btn-primary mt-5">Shop new arrivals</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((order) => {
              let items: { title: string; quantity: number }[] = [];
              try { items = JSON.parse(order.items_json); } catch { /* Invalid historical row; keep displaying the order. */ }
              return (
                <article key={order.id} className="rounded-2xl border border-neutral-200 bg-white p-6">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div><p className="font-semibold">Order {order.id}</p><p className="mt-1 text-sm text-neutral-500">{new Date(order.created_at).toLocaleDateString()}</p></div>
                    <div className="text-right"><p className="font-semibold">R {Number(order.total_amount).toFixed(2)}</p><p className="mt-1 text-sm text-neutral-500">{order.status}</p></div>
                  </div>
                  <p className="mt-4 text-sm text-neutral-600">{items.map((item) => `${item.title} × ${item.quantity}`).join(", ")}</p>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
