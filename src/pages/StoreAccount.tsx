import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { CheckCircle2, Clock, ExternalLink, Package, Truck, ChevronDown, ChevronUp } from "lucide-react";
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
  order_number?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  total_amount: number | string;
  status: string;
  fulfillment_status?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  items_json: string;
  delivery_address_json: string | null;
  shipping_fee: number | string;
  created_at: string;
  updated_at?: string;
};

export function OrdersPage() {
  const { user, ready } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

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

  function toggleExpand(id: string) {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getFulfillmentBadge(status?: string | null) {
    const s = (status || "processing").toLowerCase();
    if (s === "delivered") {
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"><CheckCircle2 className="h-3.5 w-3.5" /> Delivered</span>;
    }
    if (s === "shipped") {
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-200"><Truck className="h-3.5 w-3.5" /> Shipped</span>;
    }
    if (s === "cancelled") {
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">Cancelled</span>;
    }
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200"><Clock className="h-3.5 w-3.5" /> Processing</span>;
  }

  function getPaymentBadge(status: string) {
    const isPaid = ["Paid", "Completed", "Fulfilled"].includes(status);
    if (isPaid) {
      return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Paid</span>;
    }
    if (status === "Payment Review") {
      return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">Under Review</span>;
    }
    return <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">{status}</span>;
  }

  if (ready && !user) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-[#f6f1ea]">
      <Header />
      <main className="section-shell min-h-[55vh] py-14 sm:py-20">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="eyebrow">Your account</p>
            <h1 className="section-heading mt-3">Order history & Tracking</h1>
          </div>
          <Link to="/orders/track" className="text-sm font-medium text-neutral-600 underline hover:text-neutral-900">
            Track with order number →
          </Link>
        </div>

        {loading ? (
          <p className="mt-8 text-neutral-500">Loading your orders…</p>
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 text-center sm:p-12">
            <Package className="mx-auto h-12 w-12 text-neutral-400" />
            <h2 className="mt-4 text-lg font-semibold text-neutral-800">No orders yet</h2>
            <p className="mt-2 text-sm text-neutral-500">Items you purchase will appear here with live tracking.</p>
            <Link to="/#new-arrivals" className="btn-primary mt-6 inline-block">Shop new arrivals</Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {orders.map((order) => {
              let items: { title: string; quantity: number; price?: number; sku?: string }[] = [];
              let address: { recipientName?: string; addressLine1?: string; addressLine2?: string; suburb?: string; city?: string; province?: string; postalCode?: string; country?: string } | null = null;
              try { items = JSON.parse(order.items_json); } catch { /* ignore */ }
              try { address = order.delivery_address_json ? JSON.parse(order.delivery_address_json) : null; } catch { /* ignore */ }

              const isExpanded = expandedOrders.has(order.id);
              const orderRef = order.order_number || order.id;
              const fulfillmentStatus = (order.fulfillment_status || "processing").toLowerCase();

              const steps = [
                { key: "ordered", label: "Confirmed" },
                { key: "processing", label: "Processing" },
                { key: "shipped", label: "Shipped" },
                { key: "delivered", label: "Delivered" },
              ];

              const currentStepIndex =
                fulfillmentStatus === "delivered" ? 3 :
                fulfillmentStatus === "shipped" ? 2 :
                ["Paid", "Completed", "Fulfilled"].includes(order.status) ? 1 : 0;

              return (
                <article key={order.id} className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:border-neutral-300">
                  {/* Order Header */}
                  <div className="border-b border-neutral-100 bg-neutral-50/70 p-6 sm:flex sm:items-center sm:justify-between sm:gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-lg font-bold text-neutral-900">{orderRef}</span>
                        {getFulfillmentBadge(order.fulfillment_status)}
                        {getPaymentBadge(order.status)}
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        Placed on {new Date(order.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                    <div className="mt-4 text-left sm:mt-0 sm:text-right">
                      <p className="text-xl font-bold text-neutral-900">R {Number(order.total_amount).toFixed(2)}</p>
                      <p className="text-xs text-neutral-500">{items.reduce((acc, i) => acc + (i.quantity || 1), 0)} items</p>
                    </div>
                  </div>

                  {/* Progress Tracker Bar */}
                  <div className="p-6">
                    <div className="relative mb-6">
                      <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-neutral-100" />
                      <div
                        className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-neutral-900 transition-all duration-500"
                        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                      />
                      <div className="relative flex justify-between">
                        {steps.map((step, idx) => {
                          const isDone = idx <= currentStepIndex;
                          const isCurrent = idx === currentStepIndex;
                          return (
                            <div key={step.key} className="flex flex-col items-center">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                                  isDone
                                    ? "border-neutral-900 bg-neutral-900 text-white"
                                    : "border-neutral-200 bg-white text-neutral-400"
                                } ${isCurrent ? "ring-4 ring-neutral-200" : ""}`}
                              >
                                {isDone ? "✓" : idx + 1}
                              </div>
                              <span className={`mt-2 text-xs font-medium ${isDone ? "text-neutral-900" : "text-neutral-400"}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tracking details if available */}
                    {(order.tracking_number || order.tracking_url) && (
                      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-50/80 border border-sky-200/60 p-4 text-sm text-sky-900">
                        <div className="flex items-center gap-2">
                          <Truck className="h-5 w-5 text-sky-600" />
                          <span>
                            Tracking number: <strong className="font-semibold">{order.tracking_number || "Available"}</strong>
                          </span>
                        </div>
                        {order.tracking_url && (
                          <a
                            href={order.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition"
                          >
                            Track with Courier <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Quick items preview */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <p className="text-sm text-neutral-600">
                        {items.slice(0, 3).map((item) => `${item.title} × ${item.quantity}`).join(", ")}
                        {items.length > 3 && ` +${items.length - 3} more`}
                      </p>
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-800 hover:text-black"
                      >
                        {isExpanded ? "Hide items" : "View items & address"}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Expanded Items & Address */}
                    {isExpanded && (
                      <div className="mt-6 border-t border-neutral-100 pt-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Order Items</h3>
                        <div className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-neutral-50/40 p-4">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between py-2.5 text-sm">
                              <div>
                                <p className="font-medium text-neutral-900">{item.title}</p>
                                {item.sku && <p className="text-xs text-neutral-400">SKU: {item.sku}</p>}
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-neutral-900">
                                  {item.price ? `R ${(Number(item.price) * item.quantity).toFixed(2)}` : ""}
                                </p>
                                <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between pt-3 text-xs text-neutral-500">
                            <span>Delivery fee</span>
                            <span>R {Number(order.shipping_fee || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        {address && (
                          <div className="mt-4 rounded-2xl border border-neutral-100 bg-neutral-50/40 p-4 text-sm text-neutral-600">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Delivery Address</h4>
                            <p className="mt-1 font-medium text-neutral-900">{address.recipientName}</p>
                            <p className="mt-0.5">
                              {[address.addressLine1, address.addressLine2, address.suburb, address.city, address.province, address.postalCode, address.country]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
