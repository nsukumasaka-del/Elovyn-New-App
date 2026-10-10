import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, LayoutDashboard, PackagePlus, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest, isPrimaryAdmin, type StoreUser } from "@/lib/store-api";
import { useStore } from "@/lib/store";

type Product = {
  id: string;
  title: string;
  sku: string;
  price: number | string;
  stock_quantity: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  category: string | null;
  image_url: string | null;
};
type Stats = { total_sales: number | string; order_count: number | string; product_count: number | string };
type Supplier = {
  id: string;
  name: string;
  api_base_url: string | null;
  webhook_url: string | null;
  auto_sync: boolean;
  has_api_key: boolean;
};

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "suppliers", label: "Suppliers", icon: Settings2 },
] as const;
type Tab = typeof tabs[number]["id"];

export function AdminPage() {
  const { user, ready } = useStore();
  const [verifiedUser, setVerifiedUser] = useState<StoreUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ total_sales: 0, order_count: 0, product_count: 0 });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ user: StoreUser | null }>("/auth/session")
      .then(({ user: current }) => { if (!cancelled) setVerifiedUser(current); })
      .catch((error: Error) => toast.error(`Could not verify administrator session: ${error.message}`))
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  const loadData = useCallback(async () => {
    const inventory = await apiRequest<{ products: Product[]; stats: Stats }>("/admin/inventory");
    setProducts(inventory.products);
    setStats(inventory.stats);
    const supplierData = await apiRequest<{ suppliers: Supplier[] }>("/admin/suppliers");
    setSuppliers(supplierData.suppliers);
  }, []);

  useEffect(() => {
    if (!isPrimaryAdmin(verifiedUser)) return;
    loadData().catch((error: Error) => toast.error(`Could not load admin data: ${error.message}`));
  }, [loadData, verifiedUser]);

  if (checking || !ready) return <div className="grid min-h-screen place-items-center text-sm text-neutral-500">Checking administrator access…</div>;
  if (!verifiedUser || !user) return <Navigate to="/login" replace />;
  if (!isPrimaryAdmin(verifiedUser) || !isPrimaryAdmin(user)) return <Navigate to="/" replace />;

  async function changeStock(product: Product, change: number) {
    try {
      await apiRequest(`/admin/inventory/stock`, {
        method: "PATCH",
        body: JSON.stringify({ id: product.id, change }),
      });
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update stock.");
    }
  }

  async function saveSupplier(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest("/admin/suppliers", {
        method: "PUT",
        body: JSON.stringify({
          id: supplierId || undefined,
          name: supplierName,
          api_base_url: apiBaseUrl,
          webhook_url: webhookUrl,
          api_key: apiKey,
          auto_sync: autoSync,
        }),
      });
      setSupplierId("");
      setSupplierName("");
      setApiBaseUrl("");
      setWebhookUrl("");
      setApiKey("");
      setAutoSync(false);
      await loadData();
      toast.success("Supplier configuration saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save supplier.");
    }
  }

  function editSupplier(supplier: Supplier) {
    setSupplierId(supplier.id);
    setSupplierName(supplier.name);
    setApiBaseUrl(supplier.api_base_url ?? "");
    setWebhookUrl(supplier.webhook_url ?? "");
    setApiKey("");
    setAutoSync(supplier.auto_sync);
  }

  const stockCount = products.reduce((total, product) => total + product.stock_quantity, 0);
  const lowStockCount = products.filter((product) => product.status !== "In Stock").length;

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-neutral-950">
      <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-5 lg:px-8">
        <Link to="/" className="flex items-center gap-3 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-950 text-xs text-white">VL</span> Elovyn Admin</Link>
        <div className="flex items-center gap-4 text-sm"><span className="hidden text-neutral-500 sm:block">{verifiedUser.email}</span><Link to="/" className="rounded-full border border-neutral-300 px-4 py-2 hover:bg-neutral-50">View store</Link></div>
      </header>
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden w-60 shrink-0 border-r border-neutral-200 bg-white px-4 py-7 md:block">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-neutral-400">Store management</p>
          <nav className="mt-4 space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${tab === id ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-5 sm:p-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">Store administration</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{tabs.find((item) => item.id === tab)?.label}</h1></div>
            {tab === "inventory" && <button onClick={() => setAddOpen(true)} className="btn-primary"><PackagePlus className="mr-2 h-4 w-4" />Add product</button>}
          </div>
          <nav aria-label="Admin sections" className="mb-6 flex gap-2 overflow-x-auto md:hidden">
            {tabs.map(({ id, label }) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab === id ? "bg-neutral-950 text-white" : "border border-neutral-300 bg-white"}`}>{label}</button>)}
          </nav>

          {tab === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total sales", value: `R ${Number(stats.total_sales).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`, sub: "Orders placed" },
                  { label: "Orders", value: Number(stats.order_count).toLocaleString(), sub: "All order statuses" },
                  { label: "Products", value: Number(stats.product_count).toLocaleString(), sub: `${stockCount} units in stock` },
                  { label: "Supplier sync", value: suppliers.some((item) => item.auto_sync && item.has_api_key) ? "Configured" : "Not configured", sub: "Supplier adapter required" },
                ].map((kpi) => <article key={kpi.label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm text-neutral-500">{kpi.label}</p><p className="mt-3 text-2xl font-bold">{kpi.value}</p><p className="mt-1 text-xs text-neutral-400">{kpi.sub}</p></article>)}
              </div>
              <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
                <div className="flex items-center justify-between"><div><h2 className="font-semibold">Inventory health</h2><p className="mt-1 text-sm text-neutral-500">Products at or below five units</p></div><button onClick={() => setTab("inventory")} className="text-sm font-medium underline">Manage inventory</button></div>
                <p className="mt-6 text-4xl font-bold">{lowStockCount}<span className="ml-2 text-base font-normal text-neutral-500">products need attention</span></p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${products.length ? Math.min(100, (lowStockCount / products.length) * 100) : 0}%` }} /></div>
              </section>
            </>
          )}

          {tab === "inventory" && (
            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4"><div><h2 className="font-semibold">Product inventory</h2><p className="mt-1 text-sm text-neutral-500">{products.length} products · {stockCount} units</p></div><button onClick={() => void loadData().catch((error: Error) => toast.error(error.message))} className="text-sm underline">Refresh</button></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="px-5 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Adjust</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100">
                    {products.map((product) => <tr key={product.id}>
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-neutral-100">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <Boxes className="h-5 w-5 text-neutral-400" />}</div><div><p className="font-medium">{product.title}</p><p className="text-xs text-neutral-500">{product.category}</p></div></div></td>
                      <td className="px-4 py-4 text-neutral-600">{product.sku}</td>
                      <td className="px-4 py-4">R {Number(product.price).toFixed(2)}</td>
                      <td className="px-4 py-4 font-medium">{product.stock_quantity}</td>
                      <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${product.status === "In Stock" ? "bg-emerald-50 text-emerald-700" : product.status === "Low Stock" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{product.status}</span></td>
                      <td className="px-4 py-4"><div className="flex gap-2"><button aria-label={`Decrease ${product.title} stock`} onClick={() => void changeStock(product, -1)} className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100"><ArrowDownToLine className="h-4 w-4" /></button><button aria-label={`Increase ${product.title} stock`} onClick={() => void changeStock(product, 1)} className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100"><ArrowUpFromLine className="h-4 w-4" /></button></div></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "suppliers" && (
            <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.1fr]">
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold">{supplierId ? "Edit supplier" : "Connect a supplier"}</h2>
                <p className="mt-1 text-sm text-neutral-500">Supplier credentials are encrypted at rest and never returned to the browser.</p>
                <form onSubmit={(event) => void saveSupplier(event)} className="mt-5 space-y-4">
                  <label className="block text-sm font-medium">Supplier name<input required value={supplierName} onChange={(event) => setSupplierName(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  <label className="block text-sm font-medium">API base URL<input type="url" value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder="https://api.supplier.com" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  <label className="block text-sm font-medium">API key<input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={supplierId ? "Leave blank to keep the saved key" : "Enter API key"} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  <label className="block text-sm font-medium">Webhook URL<input type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://your-store.com/api/supplier-webhook" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={autoSync} onChange={(event) => setAutoSync(event.target.checked)} className="h-4 w-4 accent-neutral-950" />Enable automatic stock sync</label>
                  <button className="btn-primary w-full">Save configuration</button>
                </form>
              </section>
              <section className="space-y-3">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  Saving a connection stores its settings only. A supplier-specific adapter, credential verification and scheduled sync function must be configured before inventory can sync automatically.
                </div>
                {suppliers.length === 0 && <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">No supplier integrations configured.</div>}
                {suppliers.map((supplier) => (
                  <article key={supplier.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{supplier.name}</h3><p className="mt-1 text-sm text-neutral-500">{supplier.api_base_url || "No API URL configured"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs ${supplier.has_api_key ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>{supplier.has_api_key ? "Configured" : "Disconnected"}</span></div>
                    <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4"><span className="text-sm text-neutral-600">Auto-sync {supplier.auto_sync ? "enabled" : "disabled"}</span><button onClick={() => editSupplier(supplier)} className="text-sm font-medium underline">Edit</button></div>
                  </article>
                ))}
              </section>
            </div>
          )}
        </main>
      </div>
      {addOpen && <AddProductDialog onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); void loadData(); }} />}
    </div>
  );
}

function AddProductDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [category, setCategory] = useState("Streetwear");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let imageUrl: string | null = null;
      if (image) {
        const form = new FormData();
        form.set("file", image);
        const upload = await apiRequest<{ image_url: string }>("/admin/assets", { method: "POST", body: form });
        imageUrl = upload.image_url;
      }
      await apiRequest("/admin/products", {
        method: "POST",
        body: JSON.stringify({ title, sku, price: Number(price), stock_quantity: Number(stock), category, image_url: imageUrl }),
      });
      toast.success("Product added to inventory.");
      onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-product-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between"><div><p className="eyebrow">Inventory</p><h2 id="add-product-title" className="mt-1 text-2xl font-bold">Add product</h2></div><button aria-label="Close add product" onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100"><X className="h-5 w-5" /></button></header>
        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Product title<input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
          <label className="block text-sm font-medium">SKU<input required value={sku} onChange={(event) => setSku(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Price (ZAR)<input required min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="block text-sm font-medium">Stock quantity<input required min="0" step="1" type="number" value={stock} onChange={(event) => setStock(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
          </div>
          <label className="block text-sm font-medium">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3"><option>Streetwear</option><option>T-Shirts</option><option>Hoodies</option><option>Accessories</option><option>Wigs</option><option>Care</option><option>New Arrivals</option></select></label>
          <label className="block text-sm font-medium">Product image<input accept="image/jpeg,image/png,image/webp,image/gif" type="file" onChange={(event) => setImage(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2" /><span className="mt-1 block text-xs text-neutral-500">JPEG, PNG, WebP or GIF · max 5 MB</span></label>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={saving} className="btn-primary w-full disabled:opacity-60">{saving ? "Saving…" : "Save product"}</button>
        </form>
      </section>
    </div>
  );
}
