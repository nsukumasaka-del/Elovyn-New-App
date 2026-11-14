import { useEffect, useState } from "react";
import { CheckCircle2, Clock, ExternalLink, Filter, Package, RefreshCw, Search, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/store-api";

export type AdminOrder = {
  id: string;
  order_number: string | null;
  user_id: string;
  customer_email: string | null;
  customer_name: string | null;
  total_amount: number | string;
  status: string;
  fulfillment_status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  items_json: string;
  delivery_address_json: string | null;
  shipping_fee: number | string;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_id: string | null;
  paid_at: string | null;
  email_sent: boolean | number;
  created_at: string;
  updated_at: string;
};

export function AdminOrdersPanel({ selectedOrderId, onClearSelectedOrder }: { selectedOrderId?: string | null; onClearSelectedOrder?: () => void }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);

  // Fulfillment update form state
  const [editFulfillmentStatus, setEditFulfillmentStatus] = useState<string>("processing");
  const [editTrackingNumber, setEditTrackingNumber] = useState<string>("");
  const [editTrackingUrl, setEditTrackingUrl] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await apiRequest<{ orders: AdminOrder[] }>(`/admin/orders${query}`);
      setOrders(data.orders);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [statusFilter]);

  // When selectedOrderId prop changes (e.g. from notification click), open that order
  useEffect(() => {
    if (selectedOrderId) {
      const found = orders.find((o) => o.id === selectedOrderId);
      if (found) {
        openOrderDetail(found);
      } else {
        apiRequest<{ order: AdminOrder }>(`/admin/orders/${encodeURIComponent(selectedOrderId)}`)
          .then(({ order }) => openOrderDetail(order))
          .catch(() => { /* ignore */ });
      }
    }
  }, [selectedOrderId, orders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadOrders();
  };

  const openOrderDetail = (order: AdminOrder) => {
    setActiveOrder(order);
    setEditFulfillmentStatus(order.fulfillment_status || "processing");
    setEditTrackingNumber(order.tracking_number || "");
    setEditTrackingUrl(order.tracking_url || "");
  };

  const closeOrderDetail = () => {
    setActiveOrder(null);
    if (onClearSelectedOrder) onClearSelectedOrder();
  };

  const saveFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setUpdating(true);
    try {
      const { order: updated } = await apiRequest<{ order: AdminOrder }>(
        `/admin/orders/${encodeURIComponent(activeOrder.id)}/fulfillment`,
        {
          method: "PATCH",
          body: JSON.stringify({
            fulfillment_status: editFulfillmentStatus,
            tracking_number: editTrackingNumber,
            tracking_url: editTrackingUrl,
          }),
        }
      );
      toast.success(
        editFulfillmentStatus === "shipped" && activeOrder.fulfillment_status !== "shipped"
          ? `Order updated to Shipped! Shipping notification email sent to ${updated.customer_email || "customer"}.`
          : "Fulfillment details updated successfully."
      );
      setActiveOrder(updated);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update fulfillment");
    } finally {
      setUpdating(false);
    }
  };

  const getFulfillmentBadge = (status: string) => {
    const s = (status || "processing").toLowerCase();
    if (s === "delivered") {
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Delivered</span>;
    }
    if (s === "shipped") {
      return <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800"><Truck className="h-3 w-3" /> Shipped</span>;
    }
    if (s === "cancelled") {
      return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">Cancelled</span>;
    }
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"><Clock className="h-3 w-3" /> Processing</span>;
  };

  const getPaymentBadge = (status: string) => {
    if (["Paid", "Completed", "Fulfilled"].includes(status)) {
      return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">Paid</span>;
    }
    if (status === "Payment Review") {
      return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">Review</span>;
    }
    if (status === "Payment Failed") {
      return <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">Failed</span>;
    }
    return <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "All Orders" },
            { id: "processing", label: "Processing" },
            { id: "shipped", label: "Shipped" },
            { id: "delivered", label: "Delivered" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                statusFilter === tab.id
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search order #, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-52 rounded-xl border border-neutral-300 pl-8 pr-3 text-xs focus:border-neutral-900 focus:outline-none sm:w-64"
            />
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          </form>
          <button
            onClick={() => void loadOrders()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            title="Refresh orders"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-neutral-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {loading && orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-neutral-500">Loading store orders…</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-neutral-500">No orders found matching your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-3.5">Order Ref</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Total (ZAR)</th>
                  <th className="px-4 py-3.5">Payment</th>
                  <th className="px-4 py-3.5">Fulfillment</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-neutral-50/70 transition">
                      <td className="px-5 py-4 font-bold text-neutral-900">
                        {order.order_number || <span className="font-mono text-xs text-neutral-500">{order.id.slice(0, 8)}…</span>}
                      </td>
                      <td className="px-4 py-4 text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-neutral-900">{order.customer_name || "Customer"}</p>
                        <p className="text-xs text-neutral-500">{order.customer_email || "No email"}</p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-neutral-900">
                        R {Number(order.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-4">{getPaymentBadge(order.status)}</td>
                      <td className="px-4 py-4">{getFulfillmentBadge(order.fulfillment_status)}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openOrderDetail(order)}
                          className="rounded-xl border border-neutral-300 px-3.5 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail & Fulfillment Drawer Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              onClick={closeOrderDetail}
              className="absolute right-5 top-5 rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-neutral-900">
                Order {activeOrder.order_number || activeOrder.id}
              </h2>
              {getFulfillmentBadge(activeOrder.fulfillment_status)}
              {getPaymentBadge(activeOrder.status)}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Placed {new Date(activeOrder.created_at).toLocaleString()} · ID: {activeOrder.id}
            </p>

            {/* Customer & Address */}
            <div className="mt-6 grid gap-4 rounded-2xl bg-neutral-50 p-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="font-semibold uppercase tracking-wider text-neutral-500">Customer Details</span>
                <p className="mt-1 font-medium text-sm text-neutral-900">{activeOrder.customer_name || "N/A"}</p>
                <p className="text-neutral-600">{activeOrder.customer_email || "No email"}</p>
                <p className="mt-2 text-neutral-500">
                  Payment Ref: <code className="text-neutral-800">{activeOrder.payment_reference || "N/A"}</code>
                </p>
              </div>
              <div>
                <span className="font-semibold uppercase tracking-wider text-neutral-500">Shipping Address</span>
                {(() => {
                  try {
                    const addr = activeOrder.delivery_address_json ? JSON.parse(activeOrder.delivery_address_json) : null;
                    if (!addr) return <p className="mt-1 text-neutral-400">No address recorded</p>;
                    return (
                      <p className="mt-1 leading-5 text-neutral-700">
                        <strong>{addr.recipientName}</strong> ({addr.phone})<br />
                        {[addr.addressLine1, addr.addressLine2, addr.suburb, addr.city, addr.province, addr.postalCode, addr.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    );
                  } catch {
                    return <p className="mt-1 text-neutral-400">Invalid address data</p>;
                  }
                })()}
              </div>
            </div>

            {/* Items */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Purchased Items</h3>
              <div className="mt-2 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
                {(() => {
                  try {
                    const items = JSON.parse(activeOrder.items_json) as Array<{ title: string; quantity: number; price: number; sku?: string }>;
                    return items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 text-sm">
                        <div>
                          <p className="font-medium text-neutral-900">{item.title}</p>
                          {item.sku && <p className="text-xs text-neutral-400">SKU: {item.sku}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-neutral-900">R {(item.price * item.quantity).toFixed(2)}</p>
                          <p className="text-xs text-neutral-400">Qty: {item.quantity} × R {item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ));
                  } catch {
                    return <p className="p-4 text-xs text-neutral-500">Items could not be parsed</p>;
                  }
                })()}
                <div className="flex items-center justify-between bg-neutral-50/70 px-4 py-3 text-sm font-bold text-neutral-900">
                  <span>Total Paid (includes R {Number(activeOrder.shipping_fee || 0).toFixed(2)} delivery)</span>
                  <span className="text-base text-neutral-950">R {Number(activeOrder.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Fulfillment Status Controls Form */}
            <form onSubmit={saveFulfillment} className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5">
              <h3 className="text-sm font-bold text-neutral-900">Update Order Fulfillment</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Mark order progress and assign tracking information for the customer.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Status</label>
                  <select
                    value={editFulfillmentStatus}
                    onChange={(e) => setEditFulfillmentStatus(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs font-medium focus:border-neutral-900 focus:outline-none"
                  >
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Tracking Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TCG-12345678"
                    value={editTrackingNumber}
                    onChange={(e) => setEditTrackingNumber(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs focus:border-neutral-900 focus:outline-none"
                  >
                  </input>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Tracking URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editTrackingUrl}
                    onChange={(e) => setEditTrackingUrl(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs focus:border-neutral-900 focus:outline-none"
                  >
                  </input>
                </div>
              </div>

              {editFulfillmentStatus === "shipped" && activeOrder.fulfillment_status !== "shipped" && (
                <p className="mt-3 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg p-2.5">
                  ℹ️ Saving with status <strong>Shipped</strong> will automatically send a shipping confirmation email with tracking details to <strong>{activeOrder.customer_email || "the customer"}</strong>.
                </p>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeOrderDetail}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary text-xs py-2 px-5 disabled:opacity-60"
                >
                  {updating ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
