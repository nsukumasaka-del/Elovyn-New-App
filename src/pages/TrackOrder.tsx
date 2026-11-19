import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, ExternalLink, Package, Search, Truck, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { apiRequest } from "@/lib/store-api";
import { SiteReviewPrompt } from "@/components/SiteReviews";

type TrackedOrder = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  fulfillment_status: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  items_json: string;
  total_amount: number | string;
  shipping_fee: number | string;
  delivery_address_json: string | null;
  created_at: string;
  updated_at: string;
};

export function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrder = searchParams.get("order") || "";
  const initialEmail = searchParams.get("email") || "";

  const [orderQuery, setOrderQuery] = useState(initialOrder);
  const [emailQuery, setEmailQuery] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const fetchTracking = async (orderRef: string, email: string) => {
    if (!orderRef.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ order: TrackedOrder }>(
        `/orders/track?order=${encodeURIComponent(orderRef.trim())}&email=${encodeURIComponent(email.trim())}`
      );
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No matching order found. Please check your reference number and email.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder && initialEmail) {
      void fetchTracking(initialOrder, initialEmail);
    }
  }, [initialOrder, initialEmail]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchParams({ order: orderQuery.trim(), email: emailQuery.trim() });
    void fetchTracking(orderQuery, emailQuery);
  };

  const steps = [
    { key: "confirmed", label: "Order Confirmed" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  const fulfillment = (order?.fulfillment_status || "processing").toLowerCase();
  const currentStep =
    fulfillment === "delivered" ? 3 :
    fulfillment === "shipped" ? 2 :
    ["Paid", "Completed", "Fulfilled"].includes(order?.status || "") ? 1 : 0;

  let items: { title: string; quantity: number; price?: number; sku?: string }[] = [];
  let address: { recipientName?: string; addressLine1?: string; addressLine2?: string; suburb?: string; city?: string; province?: string; postalCode?: string; country?: string } | null = null;
  if (order) {
    try { items = JSON.parse(order.items_json); } catch { /* ignore */ }
    try { address = order.delivery_address_json ? JSON.parse(order.delivery_address_json) : null; } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-[#f6f1ea]">
      <Header />
      <main className="section-shell min-h-[60vh] py-14 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Account
          </Link>
          <p className="eyebrow">Public Tracking</p>
          <h1 className="section-heading mt-2">Track your shipment</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Enter your order reference number (e.g. <code>ELV-1001</code>) and the email address used during purchase.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Order Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ELV-1001"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3.5 text-sm font-medium focus:border-neutral-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={emailQuery}
                  onChange={(e) => setEmailQuery(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3.5 text-sm font-medium focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3 disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {loading ? "Locating order…" : "Track Order"}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Tracking Result Card */}
          {order && (
            <div className="mt-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-100 bg-neutral-50/80 p-6 sm:flex sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xl font-bold text-neutral-900">{order.order_number || order.id}</span>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${
                      fulfillment === "delivered" ? "bg-emerald-100 text-emerald-800" :
                      fulfillment === "shipped" ? "bg-sky-100 text-sky-800" :
                      fulfillment === "cancelled" ? "bg-red-100 text-red-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>
                      {fulfillment}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Ordered on {new Date(order.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <div className="mt-3 text-left sm:mt-0 sm:text-right">
                  <p className="text-xl font-bold text-neutral-900">R {Number(order.total_amount).toFixed(2)}</p>
                  <p className="text-xs text-neutral-500">Total Paid (ZAR)</p>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {/* Progress Tracker */}
                <div className="relative mb-8 mt-2">
                  <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-neutral-100" />
                  <div
                    className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-neutral-900 transition-all duration-500"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                  />
                  <div className="relative flex justify-between">
                    {steps.map((step, idx) => {
                      const isDone = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      return (
                        <div key={step.key} className="flex flex-col items-center">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                              isDone
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-200 bg-white text-neutral-400"
                            } ${isCurrent ? "ring-4 ring-neutral-200" : ""}`}
                          >
                            {isDone ? "✓" : idx + 1}
                          </div>
                          <span className={`mt-2 text-xs font-medium text-center ${isDone ? "text-neutral-900" : "text-neutral-400"}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tracking Link / Number */}
                {(order.tracking_number || order.tracking_url) && (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-50 p-4 border border-sky-200 text-sm text-sky-900">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-sky-600" />
                      <span>
                        Waybill / Tracking: <strong className="font-semibold">{order.tracking_number || "Available"}</strong>
                      </span>
                    </div>
                    {order.tracking_url && (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition"
                      >
                        Courier Website <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Items Breakdown */}
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Items in this package</h3>
                <div className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="font-medium text-neutral-900">{item.title}</p>
                        {item.sku && <p className="text-xs text-neutral-400">SKU: {item.sku}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-neutral-900">{item.price ? `R ${(Number(item.price) * item.quantity).toFixed(2)}` : ""}</p>
                        <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 text-xs text-neutral-500">
                    <span>Delivery fee</span>
                    <span>R {Number(order.shipping_fee || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Shipping Destination */}
                {address && (
                  <div className="mt-4 rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 text-sm text-neutral-600">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Shipping To</h4>
                    <p className="mt-1 font-medium text-neutral-900">{address.recipientName}</p>
                    <p className="mt-0.5">
                      {[address.addressLine1, address.addressLine2, address.suburb, address.city, address.province, address.postalCode, address.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
                {["Paid", "Completed", "Fulfilled", "Shipped", "Delivered"].includes(order.status) && <div className="mt-6"><SiteReviewPrompt orderId={order.id} /></div>}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
