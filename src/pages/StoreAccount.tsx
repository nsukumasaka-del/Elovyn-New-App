import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { apiRequest, readSavedProduct, type CartProduct } from "@/lib/store-api";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { normalizeDeliveryAddress, type DeliveryAddress } from "@/lib/delivery-address";

const emptyDeliveryAddress: DeliveryAddress = {
  recipientName: "", phone: "", addressLine1: "", addressLine2: "", suburb: "", city: "", province: "", postalCode: "", country: "South Africa",
};

function addressFromJson(value: string | null | undefined, fullName = "") {
  try {
    const normalized = normalizeDeliveryAddress(value ? JSON.parse(value) : null);
    if (normalized.ok) return normalized.address;
  } catch { /* Use an empty editable address for missing or historical invalid data. */ }
  return { ...emptyDeliveryAddress, recipientName: fullName };
}

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
  const { user, ready, setAuthOpen, saveDeliveryAddress } = useStore();
  const [address, setAddress] = useState<DeliveryAddress>(emptyDeliveryAddress);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    setAddress(addressFromJson(user?.deliveryAddressJson, user?.fullName || ""));
  }, [user?.deliveryAddressJson, user?.fullName]);

  async function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAddress(true);
    try { await saveDeliveryAddress(address); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your delivery address."); }
    finally { setSavingAddress(false); }
  }

  function updateAddress(field: keyof DeliveryAddress, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
  }

  if (ready && !user) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-[#f6f1ea]">
      <Header />
      <main className="section-shell min-h-[55vh] py-14 sm:py-20">
        <p className="eyebrow">Account</p>
        <h1 className="section-heading mt-3">My profile</h1>
        {user ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-3xl border border-neutral-200 bg-white p-7">
              <p className="text-sm text-neutral-500">Signed in as</p>
              {user.fullName && <p className="mt-1 text-lg font-semibold">{user.fullName}</p>}
              <p className={`${user.fullName ? "mt-1" : "mt-1 text-lg font-semibold"} text-sm text-neutral-600`}>{user.email}</p>
              <Link to="/orders" className="btn-secondary mt-6">View order history</Link>
            </section>
            <form onSubmit={(event) => void submitAddress(event)} className="rounded-3xl border border-neutral-200 bg-white p-7">
              <h2 className="text-xl font-bold">Delivery address</h2>
              <p className="mt-1 text-sm text-neutral-500">Orders can only be checked out after this address has been saved.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium sm:col-span-2">Recipient full name<input required autoComplete="name" maxLength={100} value={address.recipientName} onChange={(event) => updateAddress("recipientName", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                <label className="text-sm font-medium sm:col-span-2">Phone number<input required type="tel" autoComplete="tel" minLength={7} maxLength={30} value={address.phone} onChange={(event) => updateAddress("phone", event.target.value)} placeholder="+27 82 123 4567" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                <label className="text-sm font-medium sm:col-span-2">Street address<input required autoComplete="address-line1" maxLength={160} value={address.addressLine1} onChange={(event) => updateAddress("addressLine1", event.target.value)} placeholder="House number and street" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                <label className="text-sm font-medium sm:col-span-2">Apartment, unit, or complex (optional)<input autoComplete="address-line2" maxLength={100} value={address.addressLine2} onChange={(event) => updateAddress("addressLine2", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                <label className="text-sm font-medium">Suburb<input required autoComplete="address-level3" maxLength={100} value={address.suburb} onChange={(event) => updateAddress("suburb", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                <label className="text-sm font-medium">City or town<input required autoComplete="address-level2" maxLength={100} value={address.city} onChange={(event) => updateAddress("city", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                <label className="text-sm font-medium">Province or state<input required autoComplete="address-level1" maxLength={100} value={address.province} onChange={(event) => updateAddress("province", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                <label className="text-sm font-medium">Postal code<input required autoComplete="postal-code" maxLength={20} value={address.postalCode} onChange={(event) => updateAddress("postalCode", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                <label className="text-sm font-medium sm:col-span-2">Country<input required autoComplete="country-name" maxLength={100} value={address.country} onChange={(event) => updateAddress("country", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
              </div>
              <button disabled={savingAddress} className="btn-primary mt-6 disabled:opacity-60">{savingAddress ? "Saving…" : user.deliveryAddressJson ? "Update delivery address" : "Save delivery address"}</button>
            </form>
          </div>
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
  delivery_address_json: string | null;
  shipping_fee: number | string;
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
              let address: { recipientName?: string; addressLine1?: string; addressLine2?: string; suburb?: string; city?: string; province?: string; postalCode?: string; country?: string } | null = null;
              try { items = JSON.parse(order.items_json); } catch { /* Invalid historical row; keep displaying the order. */ }
              try { address = order.delivery_address_json ? JSON.parse(order.delivery_address_json) : null; } catch { /* Historical orders may not have a delivery address. */ }
              return (
                <article key={order.id} className="rounded-2xl border border-neutral-200 bg-white p-6">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div><p className="font-semibold">Order {order.id}</p><p className="mt-1 text-sm text-neutral-500">{new Date(order.created_at).toLocaleDateString()}</p></div>
                    <div className="text-right"><p className="font-semibold">R {Number(order.total_amount).toFixed(2)}</p><p className="mt-1 text-sm text-neutral-500">{order.status}</p></div>
                  </div>
                  <p className="mt-4 text-sm text-neutral-600">{items.map((item) => `${item.title} × ${item.quantity}`).join(", ")}</p>
                  <p className="mt-2 text-sm text-neutral-500">Includes R {Number(order.shipping_fee || 0).toFixed(2)} delivery</p>
                  {address && <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-neutral-500"><span className="font-medium text-neutral-700">Deliver to:</span> {[address.recipientName, address.addressLine1, address.addressLine2, address.suburb, address.city, address.province, address.postalCode, address.country].filter(Boolean).join(", ")}</p>}
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
