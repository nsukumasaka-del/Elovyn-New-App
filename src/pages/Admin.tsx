import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, LayoutDashboard, PackagePlus, Pencil, Plus, Search, Settings2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest, isPrimaryAdmin, type StoreUser } from "@/lib/store-api";
import { useStore } from "@/lib/store";
import { buildImportProducts, importFieldDefinitions, parseCsv, suggestedMapping, type ImportField, type ImportMapping } from "@/lib/product-import";
import { supplierUrlValidationError } from "@/lib/supplier-validation";

type Product = {
  id: string;
  title: string;
  sku: string;
  price: number | string;
  stock_quantity: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  category: string | null;
  image_url: string | null;
  is_listed: boolean;
};
type Stats = { total_sales: number | string; order_count: number | string; product_count: number | string };
type Supplier = {
  id: string;
  name: string;
  api_base_url: string | null;
  webhook_url: string | null;
  account_email: string | null;
  auto_sync: boolean;
  is_active: boolean;
  has_api_key: boolean;
  has_api_secret: boolean;
  adapter: "cj" | "eprolo" | "generic_json";
  field_mapping_json: string;
  connection_status: "pending" | "syncing" | "connected" | "error";
  last_sync_at: string | null;
  last_sync_error: string | null;
  sync_history: { id: string; status: "running" | "success" | "error"; imported_count: number; updated_count: number; total_count: number; error_message: string | null; started_at: string; finished_at: string | null }[];
};
type VariantFields = { sku: string; price: string; compareAt: string; barcode: string; stock: string };
type SupplierSearchProduct = { id: string; sku: string; title: string; image_url: string; price: number; category: string; currency: string };
type SupplierCategory = { id: string; name: string; group: string };

const customSupplierPresets = {
  "API key headers": {
    products_path: "data.list",
    request: { method: "GET", headers: { "X-Api-Key": "{{api_key}}", "X-Api-Secret": "{{api_secret}}" }, query: { page: 1, limit: 50 } },
    fields: { external_id: "id", title: "product_name", description: "description", sku: "sku", price: "sale_price", stock_quantity: "inventory", image_url: "image", images: "images", category: "category", variants: "variants", options: "options" },
  },
  "Bearer token": {
    products_path: "result.items",
    request: { method: "GET", headers: { Authorization: "Bearer {{api_key}}" }, query: { page: 1, page_size: 50 } },
    fields: { external_id: "id", title: "name", description: "description", sku: "sku", price: "price", stock_quantity: "stock", image_url: "image_url", category: "category" },
  },
  "POST JSON": {
    products_path: "data.products",
    request: { method: "POST", headers: { "app-key": "{{api_key}}", "app-secret": "{{api_secret}}" }, body: { page: 1, limit: 50 } },
    fields: { external_id: "product_id", title: "title", description: "description", sku: "sku", price: "price", stock_quantity: "quantity", image_url: "image", category: "category" },
  },
} as const;

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "suppliers", label: "Suppliers", icon: Settings2 },
  { id: "imports", label: "Import products", icon: Upload },
] as const;
type Tab = typeof tabs[number]["id"];

export function AdminPage() {
  const { user, ready, refreshProducts } = useStore();
  const [verifiedUser, setVerifiedUser] = useState<StoreUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ total_sales: 0, order_count: 0, product_count: 0 });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [supplierAccountEmail, setSupplierAccountEmail] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [supplierActive, setSupplierActive] = useState(true);
  const [supplierAdapter, setSupplierAdapter] = useState<"cj" | "eprolo" | "generic_json">("cj");
  const [fieldMapping, setFieldMapping] = useState("{}");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [syncingSupplierIds, setSyncingSupplierIds] = useState<Set<string>>(() => new Set());
  const [deletingSupplierId, setDeletingSupplierId] = useState("");
  const [deletingProductId, setDeletingProductId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  function resetSupplierForm() {
    setSupplierId("");
    setSupplierName("");
    setApiBaseUrl("");
    setWebhookUrl("");
    setApiKey("");
    setApiSecret("");
    setSupplierAccountEmail("");
    setAutoSync(false);
    setSupplierActive(true);
    setSupplierAdapter("cj");
    setFieldMapping("{}");
  }

  function beginNewSupplier() {
    resetSupplierForm();
    window.setTimeout(() => document.getElementById("supplier-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

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
    setSelectedProductIds((current) => {
      const available = new Set(inventory.products.map((product) => product.id));
      return new Set([...current].filter((id) => available.has(id)));
    });
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

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete ${product.title} (${product.sku})? This permanently removes the product, all of its variants, and its inventory from the storefront.`)) return;
    setDeletingProductId(product.id);
    try {
      await apiRequest(`/admin/products/${encodeURIComponent(product.id)}`, { method: "DELETE" });
      if (editProductId === product.id) setEditProductId(null);
      await Promise.all([loadData(), refreshProducts()]);
      toast.success(`${product.title} was deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the product.");
    } finally {
      setDeletingProductId("");
    }
  }

  async function updateProducts(ids: string[], updates: { is_listed?: boolean; category?: string | null }, message: string) {
    if (!ids.length) return false;
    setBulkBusy(true);
    try {
      await apiRequest("/admin/products/bulk", {
        method: "PATCH",
        body: JSON.stringify({ ids, ...updates }),
      });
      await Promise.all([loadData(), refreshProducts()]);
      toast.success(message);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the selected products.");
      return false;
    } finally {
      setBulkBusy(false);
    }
  }

  async function deleteSelectedProducts() {
    const ids = [...selectedProductIds];
    if (!ids.length || !window.confirm(`Delete ${ids.length} selected product${ids.length === 1 ? "" : "s"}? This permanently removes their variants and inventory from the storefront.`)) return;
    setBulkBusy(true);
    try {
      await apiRequest("/admin/products/bulk", { method: "DELETE", body: JSON.stringify({ ids }) });
      setSelectedProductIds(new Set());
      await Promise.all([loadData(), refreshProducts()]);
      toast.success(`${ids.length} product${ids.length === 1 ? "" : "s"} deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the selected products.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function saveSupplier(event: FormEvent) {
    event.preventDefault();
    setSavingSupplier(true);
    try {
      if (apiBaseUrl) {
        const urlError = supplierUrlValidationError(apiBaseUrl, window.location.hostname);
        if (urlError) throw new Error(urlError);
      }
      if (!apiBaseUrl && supplierAdapter === "generic_json") throw new Error("A product feed URL is required.");
      let parsedMapping: unknown;
      try { parsedMapping = JSON.parse(fieldMapping); } catch { throw new Error("Field mapping must be valid JSON."); }
      const response = await apiRequest<{ sync: { imported: number; updated: number } }>("/admin/suppliers", {
        method: "PUT",
        body: JSON.stringify({
          id: supplierId || undefined,
          name: supplierName,
          api_base_url: apiBaseUrl,
          webhook_url: webhookUrl,
          api_key: apiKey,
          api_secret: apiSecret,
          account_email: supplierAccountEmail,
          auto_sync: autoSync,
          is_active: supplierActive,
          adapter: supplierAdapter,
          field_mapping: parsedMapping,
        }),
      });
      resetSupplierForm();
      await loadData();
      toast.success(supplierActive ? `Supplier saved and synchronized: ${response.sync.imported} added, ${response.sync.updated} updated.` : "Supplier saved and validated. Enable it when you are ready to synchronize.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save supplier.");
      await loadData().catch(() => undefined);
    } finally { setSavingSupplier(false); }
  }

  function editSupplier(supplier: Supplier) {
    setSupplierId(supplier.id);
    setSupplierName(supplier.name);
    setApiBaseUrl(supplier.api_base_url ?? "");
    setWebhookUrl(supplier.webhook_url ?? "");
    setApiKey("");
    setApiSecret("");
    setSupplierAccountEmail(supplier.account_email ?? "");
    setAutoSync(supplier.auto_sync);
    setSupplierActive(supplier.is_active);
    setSupplierAdapter(supplier.adapter);
    setFieldMapping(supplier.field_mapping_json || "{}");
  }

  async function syncSupplier(id: string) {
    setSyncingSupplierIds((current) => new Set(current).add(id));
    try {
      const response = await apiRequest<{ sync: { imported: number; updated: number } }>(`/admin/suppliers/${encodeURIComponent(id)}/sync`, { method: "POST" });
      await loadData();
      toast.success(`Supplier sync complete: ${response.sync.imported} added, ${response.sync.updated} updated.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Supplier sync failed."); }
    finally { setSyncingSupplierIds((current) => { const next = new Set(current); next.delete(id); return next; }); }
  }

  async function setSupplierEnabled(supplier: Supplier, isActive: boolean) {
    try {
      await apiRequest(`/admin/suppliers/${encodeURIComponent(supplier.id)}`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) });
      await loadData();
      toast.success(`${supplier.name} ${isActive ? "enabled" : "disabled"}.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update supplier status."); }
  }

  async function deleteSupplier(supplier: Supplier) {
    if (!window.confirm(`Delete ${supplier.name}? Imported products will remain in your catalog, but this supplier's connection and sync history will be removed.`)) return;
    setDeletingSupplierId(supplier.id);
    try {
      await apiRequest(`/admin/suppliers/${encodeURIComponent(supplier.id)}`, { method: "DELETE" });
      if (supplierId === supplier.id) resetSupplierForm();
      await loadData();
      toast.success(`${supplier.name} was deleted.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete supplier."); }
    finally { setDeletingSupplierId(""); }
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
            {tab === "suppliers" && <button onClick={beginNewSupplier} className="btn-primary"><Plus className="mr-2 h-4 w-4" />Add new supplier</button>}
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
                  { label: "Supplier sync", value: suppliers.filter((item) => item.is_active).length.toLocaleString(), sub: `${suppliers.length} configured supplier${suppliers.length === 1 ? "" : "s"}` },
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4"><div><h2 className="font-semibold">Product inventory</h2><p className="mt-1 text-sm text-neutral-500">{products.length} products · {stockCount} units</p></div><button onClick={() => void loadData().catch((error: Error) => toast.error(error.message))} className="text-sm underline">Refresh</button></div>
              {selectedProductIds.size > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-5 py-3">
                <span className="mr-auto text-sm font-medium">{selectedProductIds.size} selected</span>
                <button disabled={bulkBusy} onClick={() => setBulkEditOpen(true)} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-50">Edit selected</button>
                <button disabled={bulkBusy} onClick={() => void updateProducts([...selectedProductIds], { is_listed: true }, "Selected products are now listed.")} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-50">List</button>
                <button disabled={bulkBusy} onClick={() => void updateProducts([...selectedProductIds], { is_listed: false }, "Selected products are now unlisted.")} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-50">Unlist</button>
                <button disabled={bulkBusy} onClick={() => void deleteSelectedProducts()} className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50">Delete selected</button>
                <button disabled={bulkBusy} onClick={() => setSelectedProductIds(new Set())} className="px-2 py-1.5 text-sm underline disabled:opacity-50">Clear</button>
              </div>}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="px-4 py-3"><input type="checkbox" aria-label="Select all inventory products" checked={products.length > 0 && selectedProductIds.size === products.length} onChange={(event) => setSelectedProductIds(event.target.checked ? new Set(products.map((product) => product.id)) : new Set())} className="h-4 w-4 accent-neutral-950" /></th><th className="px-3 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Inventory</th><th className="px-4 py-3">Listing</th><th className="px-4 py-3">Actions</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100">
                    {products.map((product) => <tr key={product.id}>
                      <td className="px-4 py-4"><input type="checkbox" aria-label={`Select ${product.title}`} checked={selectedProductIds.has(product.id)} onChange={(event) => setSelectedProductIds((current) => { const next = new Set(current); if (event.target.checked) next.add(product.id); else next.delete(product.id); return next; })} className="h-4 w-4 accent-neutral-950" /></td>
                      <td className="px-3 py-4"><div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-neutral-100">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <Boxes className="h-5 w-5 text-neutral-400" />}</div><div><p className="font-medium">{product.title}</p><p className="text-xs text-neutral-500">{product.category}</p></div></div></td>
                      <td className="px-4 py-4 text-neutral-600">{product.sku}</td>
                      <td className="px-4 py-4">R {Number(product.price).toFixed(2)}</td>
                      <td className="px-4 py-4 font-medium">{product.stock_quantity}</td>
                      <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${product.status === "In Stock" ? "bg-emerald-50 text-emerald-700" : product.status === "Low Stock" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{product.status}</span></td>
                      <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${product.is_listed ? "bg-sky-50 text-sky-700" : "bg-neutral-100 text-neutral-600"}`}>{product.is_listed ? "Listed" : "Unlisted"}</span></td>
                      <td className="px-4 py-4"><div className="flex gap-2">
                        <button disabled={bulkBusy} onClick={() => void updateProducts([product.id], { is_listed: !product.is_listed }, `${product.title} is now ${product.is_listed ? "unlisted" : "listed"}.`)} className="whitespace-nowrap rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-neutral-100 disabled:opacity-50">{product.is_listed ? "Unlist" : "List"}</button>
                        <button aria-label={`Edit ${product.title}`} onClick={() => setEditProductId(product.id)} className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100"><Pencil className="h-4 w-4" /></button>
                        <button aria-label={`Decrease ${product.title} stock`} onClick={() => void changeStock(product, -1)} className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100"><ArrowDownToLine className="h-4 w-4" /></button>
                        <button aria-label={`Increase ${product.title} stock`} onClick={() => void changeStock(product, 1)} className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100"><ArrowUpFromLine className="h-4 w-4" /></button>
                        <button aria-label={`Delete ${product.title}`} disabled={deletingProductId === product.id} onClick={() => void deleteProduct(product)} className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                      </div></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "suppliers" && (
            <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.1fr]">
              <section id="supplier-editor" className="scroll-mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{supplierId ? "Edit supplier" : "Add a new supplier"}</h2>{supplierId && <button type="button" onClick={beginNewSupplier} className="text-sm font-medium underline">Add another</button>}</div>
                <p className="mt-1 text-sm text-neutral-500">Supplier credentials are encrypted at rest and never returned to the browser.</p>
                <form onSubmit={(event) => void saveSupplier(event)} className="mt-5 space-y-4">
                  <label className="block text-sm font-medium">Integration type<select value={supplierAdapter} onChange={(event) => setSupplierAdapter(event.target.value as typeof supplierAdapter)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3"><option value="cj">CJ Dropshipping</option><option value="eprolo">EPROLO</option><option value="generic_json">Custom or ZA supplier (JSON/API feed)</option></select><span className="mt-1 block text-xs font-normal text-neutral-500">EPROLO uses its native signed API. Custom feeds can configure methods, headers, query parameters, request bodies, and response paths without backend changes.</span></label>
                  <label className="block text-sm font-medium">Supplier name<input required value={supplierName} onChange={(event) => setSupplierName(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  {supplierAdapter === "cj" && <label className="block text-sm font-medium">CJ account email (optional)<input type="email" autoComplete="email" value={supplierAccountEmail} onChange={(event) => setSupplierAccountEmail(event.target.value)} placeholder="you@example.com" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /><span className="mt-1 block text-xs font-normal text-neutral-500">Included in CJ token authentication when supplied. CJ currently requires the API key.</span></label>}
                  <label className="block text-sm font-medium">{supplierAdapter === "generic_json" ? "Product API / JSON feed URL" : "API base URL (optional)"}<input type="url" value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder={supplierAdapter === "cj" ? "https://developers.cjdropshipping.com/api2.0/v1" : supplierAdapter === "eprolo" ? "https://openapi.eprolo.com/" : "https://supplier.example/products.json"} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  <label className="block text-sm font-medium">API key{supplierAdapter === "generic_json" ? " (optional)" : ""}<input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={supplierId ? "Leave blank to keep the saved key" : supplierAdapter === "generic_json" ? "Use {{api_key}} in custom headers" : "Enter API key"} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  {supplierAdapter !== "cj" && <label className="block text-sm font-medium">API secret{supplierAdapter === "generic_json" ? " (optional)" : ""}<input type="password" autoComplete="new-password" value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} placeholder={supplierId ? "Leave blank to keep the saved secret" : supplierAdapter === "eprolo" ? "Enter EPROLO API Secret" : "Use {{api_secret}} in custom headers or payloads"} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>}
                  <label className="block text-sm font-medium">Webhook URL<input type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://your-store.com/api/supplier-webhook" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  {supplierAdapter === "generic_json" && <div className="rounded-xl border border-neutral-200 p-4"><label className="block text-sm font-medium">Request configuration & field mapping (JSON)<textarea value={fieldMapping} onChange={(event) => setFieldMapping(event.target.value)} rows={14} placeholder={'{"products_path":"data.list","request":{"method":"GET","headers":{"X-Api-Key":"{{api_key}}"},"query":{"limit":50}},"fields":{"title":"product_name","sku":"sku","price":"sale_price"}}'} className="mt-1.5 w-full rounded-xl border border-neutral-300 p-3 font-mono text-xs" /><span className="mt-1 block text-xs font-normal text-neutral-500">Paths support dot notation and array indexes. Secrets remain encrypted: reference them with <code>{"{{api_key}}"}</code> and <code>{"{{api_secret}}"}</code>. Methods: GET, POST, or PUT.</span></label><div className="mt-3 flex flex-wrap gap-2"><span className="w-full text-xs font-semibold uppercase tracking-wider text-neutral-500">Start from a preset</span>{Object.entries(customSupplierPresets).map(([name, preset]) => <button key={name} type="button" onClick={() => setFieldMapping(JSON.stringify(preset, null, 2))} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50">{name}</button>)}</div></div>}
                  <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={supplierActive} onChange={(event) => setSupplierActive(event.target.checked)} className="h-4 w-4 accent-neutral-950" />Supplier is active</label>
                  <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={autoSync} onChange={(event) => setAutoSync(event.target.checked)} className="h-4 w-4 accent-neutral-950" />Enable automatic stock sync</label>
                  <button disabled={savingSupplier} className="btn-primary w-full disabled:opacity-60">{savingSupplier ? "Validating and syncing…" : supplierActive ? "Save, validate & sync" : "Save and validate"}</button>
                </form>
              </section>
              <section className="space-y-3">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  Saving validates the credentials and immediately imports or updates up to 50 products. Use Sync now whenever you need a fresh inventory push.
                </div>
                {suppliers.length === 0 && <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">No supplier integrations configured.</div>}
                {suppliers.map((supplier) => (
                  <article key={supplier.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{supplier.name}</h3><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">{supplier.adapter === "cj" ? "CJ Dropshipping" : supplier.adapter === "eprolo" ? "EPROLO" : "JSON API"}</span></div><p className="mt-1 break-all text-sm text-neutral-500">{supplier.api_base_url || (supplier.adapter === "eprolo" ? "EPROLO default API endpoint" : "CJ default API endpoint")}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${!supplier.is_active ? "bg-neutral-100 text-neutral-500" : supplier.connection_status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{!supplier.is_active ? "Inactive" : supplier.connection_status === "syncing" ? "Syncing" : supplier.connection_status === "connected" ? "Connected" : supplier.connection_status === "error" ? "Error" : "Pending"}</span></div>
                    {supplier.last_sync_error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{supplier.last_sync_error}</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4"><span className="text-sm text-neutral-600">{supplier.last_sync_at ? `Last synced ${new Date(supplier.last_sync_at).toLocaleString()}` : "Not synced yet"}</span><div className="flex flex-wrap gap-3"><button disabled={!supplier.is_active || syncingSupplierIds.has(supplier.id)} onClick={() => void syncSupplier(supplier.id)} className="text-sm font-medium underline disabled:opacity-40">{syncingSupplierIds.has(supplier.id) ? "Syncing…" : "Sync now"}</button><button onClick={() => editSupplier(supplier)} className="text-sm font-medium underline">Edit</button><button onClick={() => void setSupplierEnabled(supplier, !supplier.is_active)} className="text-sm font-medium underline">{supplier.is_active ? "Disable" : "Enable"}</button><button disabled={deletingSupplierId === supplier.id} onClick={() => void deleteSupplier(supplier)} className="inline-flex items-center gap-1 text-sm font-medium text-red-700 underline disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />{deletingSupplierId === supplier.id ? "Deleting…" : "Delete"}</button></div></div>
                    <details className="mt-4 border-t border-neutral-100 pt-3"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-neutral-500">Sync history ({supplier.sync_history.length})</summary>{supplier.sync_history.length ? <div className="mt-3 space-y-2">{supplier.sync_history.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg bg-neutral-50 p-2.5 text-xs"><div><p className="font-medium">{entry.status === "success" ? `${entry.imported_count} added · ${entry.updated_count} updated` : entry.status === "running" ? "Sync in progress" : entry.error_message || "Sync failed"}</p><p className="mt-1 text-neutral-500">{new Date(entry.started_at).toLocaleString()}</p></div><span className={`rounded-full px-2 py-0.5 capitalize ${entry.status === "success" ? "bg-emerald-100 text-emerald-700" : entry.status === "error" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"}`}>{entry.status}</span></div>)}</div> : <p className="mt-2 text-xs text-neutral-500">No sync attempts recorded yet.</p>}</details>
                  </article>
                ))}
              </section>
            </div>
          )}

          {tab === "imports" && <ImportProductsPanel suppliers={suppliers} onImported={() => void Promise.all([loadData(), refreshProducts()])} />}
        </main>
      </div>
      {addOpen && <AddProductDialog onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); void Promise.all([loadData(), refreshProducts()]); }} />}
      {editProductId && <AddProductDialog productId={editProductId} onClose={() => setEditProductId(null)} onCreated={() => { setEditProductId(null); void Promise.all([loadData(), refreshProducts()]); }} />}
      {bulkEditOpen && <BulkEditDialog count={selectedProductIds.size} busy={bulkBusy} onClose={() => setBulkEditOpen(false)} onSave={async (updates) => { const saved = await updateProducts([...selectedProductIds], updates, `${selectedProductIds.size} selected product${selectedProductIds.size === 1 ? "" : "s"} updated.`); if (saved) setBulkEditOpen(false); }} />}
    </div>
  );
}

function BulkEditDialog({ count, busy, onClose, onSave }: { count: number; busy: boolean; onClose: () => void; onSave: (updates: { is_listed?: boolean; category?: string | null }) => Promise<void> }) {
  const [listing, setListing] = useState<"unchanged" | "listed" | "unlisted">("unchanged");
  const [changeCategory, setChangeCategory] = useState(false);
  const [category, setCategory] = useState("");
  const canSave = listing !== "unchanged" || changeCategory;
  return <div className="fixed inset-0 z-[95] grid place-items-center bg-black/45 p-4" onMouseDown={() => { if (!busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="bulk-edit-title" className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <header className="flex items-center justify-between"><div><p className="eyebrow">Inventory</p><h2 id="bulk-edit-title" className="mt-1 text-2xl font-bold">Edit {count} selected product{count === 1 ? "" : "s"}</h2></div><button disabled={busy} aria-label="Close bulk editor" onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100 disabled:opacity-50"><X className="h-5 w-5" /></button></header>
      <div className="mt-6 space-y-5">
        <label className="block text-sm font-medium">Listing status<select value={listing} onChange={(event) => setListing(event.target.value as typeof listing)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3"><option value="unchanged">Leave unchanged</option><option value="listed">List on storefront</option><option value="unlisted">Unlist from storefront</option></select></label>
        <div>
          <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={changeCategory} onChange={(event) => setChangeCategory(event.target.checked)} className="h-4 w-4 accent-neutral-950" />Change category for every selected product</label>
          {changeCategory && <input value={category} maxLength={100} onChange={(event) => setCategory(event.target.value)} placeholder="Category (leave blank to clear)" className="mt-2 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm" />}
        </div>
        <div className="flex justify-end gap-3"><button disabled={busy} onClick={onClose} className="btn-secondary disabled:opacity-50">Cancel</button><button disabled={busy || !canSave} onClick={() => void onSave({ ...(listing !== "unchanged" ? { is_listed: listing === "listed" } : {}), ...(changeCategory ? { category: category.trim() || null } : {}) })} className="btn-primary disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button></div>
      </div>
    </section>
  </div>;
}

function AddProductDialog({ onClose, onCreated, productId }: { onClose: () => void; onCreated: () => void; productId?: string }) {
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [category, setCategory] = useState("Streetwear");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [optionRows, setOptionRows] = useState(productId ? [] : [{ name: "Size", values: "S, M, L" }]);
  const [variantFields, setVariantFields] = useState<Record<string, VariantFields>>({});
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [colorImageFiles, setColorImageFiles] = useState<Record<string, File | null>>({});
  const [colorImageUrls, setColorImageUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(Boolean(productId));
  const selectedImagePreviews = useMemo(() => images.map((file) => ({ file, url: URL.createObjectURL(file) })), [images]);
  useEffect(() => () => selectedImagePreviews.forEach(({ url }) => URL.revokeObjectURL(url)), [selectedImagePreviews]);
  const matrix = useMemo(() => {
    const options = optionRows.map((option) => ({
      name: option.name.trim(),
      values: [...new Set(option.values.split(",").map((value) => value.trim()).filter(Boolean))],
    })).filter((option) => option.name && option.values.length);
    if (!options.length) return { options, combinations: [{}] as Record<string, string>[], tooMany: false };
    let combinations: Record<string, string>[] = [{}];
    for (const option of options) {
      if (combinations.length * option.values.length > 100) {
        return { options, combinations, tooMany: true };
      }
      combinations = combinations.flatMap((row) =>
        option.values.map((value) => ({ ...row, [option.name]: value })),
      );
    }
    return { options, combinations, tooMany: false };
  }, [optionRows]);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    apiRequest<{
      product: { title: string; sku: string; price: number; stock_quantity: number; category: string | null; brand: string | null; description: string | null; image_url: string | null; images_json: string };
      options: { name: string; values_json: string }[];
      variants: { sku: string; price: number; compare_at_price: number | null; barcode: string | null; options_json: string; image_url: string | null; inventory_quantity: number }[];
    }>(`/products/${encodeURIComponent(productId)}`)
      .then((detail) => {
        if (!active) return;
        setTitle(detail.product.title);
        setSku(detail.product.sku);
        setPrice(String(detail.product.price));
        setStock(String(detail.product.stock_quantity));
        setCategory(detail.product.category || "Streetwear");
        setBrand(detail.product.brand || "");
        setDescription(detail.product.description || "");
        let savedImages: unknown = [];
        try { savedImages = JSON.parse(detail.product.images_json); } catch { savedImages = []; }
        setExistingImageUrls([...new Set([detail.product.image_url, ...(Array.isArray(savedImages) ? savedImages : [])].filter((url): url is string => typeof url === "string" && Boolean(url)))]);
        setOptionRows(detail.options.map((option) => {
          let values: unknown = [];
          try { values = JSON.parse(option.values_json); } catch { values = []; }
          return { name: option.name, values: Array.isArray(values) ? values.join(", ") : "" };
        }));
        const nextColorImages: Record<string, string> = {};
        setVariantFields(Object.fromEntries(detail.variants.map((variant) => {
          let values: unknown = {};
          try { values = JSON.parse(variant.options_json); } catch { values = {}; }
          const optionValues = values && typeof values === "object" && !Array.isArray(values) ? values : {};
          const color = Object.entries(optionValues).find(([name, value]) => /^(?:color|colour)$/i.test(name) && typeof value === "string")?.[1];
          if (typeof color === "string" && variant.image_url) nextColorImages[color] = variant.image_url;
          return [JSON.stringify(optionValues), {
            sku: variant.sku,
            price: String(variant.price),
            compareAt: variant.compare_at_price == null ? "" : String(variant.compare_at_price),
            barcode: variant.barcode || "",
            stock: String(variant.inventory_quantity),
          }];
        })));
        setColorImageUrls(nextColorImages);
      })
      .catch((reason: Error) => { if (active) setError(`Could not load product: ${reason.message}`); })
      .finally(() => { if (active) setLoadingProduct(false); });
    return () => { active = false; };
  }, [productId]);

  const colorOption = matrix.options.find((option) => /^(?:color|colour)$/i.test(option.name));

  async function uploadImage(file: File) {
    const form = new FormData();
    form.set("file", file);
    return (await apiRequest<{ image_url: string }>("/admin/assets", { method: "POST", body: form })).image_url;
  }

  function addGalleryImages(files: File[]) {
    const supported = files.filter((file) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type));
    if (supported.length !== files.length) setError("Only JPEG, PNG, WebP, and GIF images can be added.");
    setImages((current) => {
      const seen = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const additions = supported.filter((file) => !seen.has(`${file.name}:${file.size}:${file.lastModified}`));
      const available = Math.max(0, 20 - existingImageUrls.length - current.length);
      if (additions.length > available) setError("A product can have no more than 20 gallery images.");
      return [...current, ...additions.slice(0, available)];
    });
  }

  function updateVariantField(key: string, field: keyof VariantFields, value: string) {
    setVariantFields((current) => ({
      ...current,
      [key]: {
        sku: current[key]?.sku ?? "",
        price: current[key]?.price ?? price,
        compareAt: current[key]?.compareAt ?? "",
        barcode: current[key]?.barcode ?? "",
        stock: current[key]?.stock ?? "0",
        [field]: value,
      },
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (matrix.tooMany) {
      setError("A product can have no more than 100 variants.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (images.length + existingImageUrls.length > 20) throw new Error("A product can have no more than 20 gallery images.");
      const uploadedGallery = await Promise.all(images.map(uploadImage));
      const nextColorImageUrls = { ...colorImageUrls };
      await Promise.all(Object.entries(colorImageFiles).map(async ([color, file]) => {
        if (file) nextColorImageUrls[color] = await uploadImage(file);
      }));
      const galleryImages = [...new Set([...existingImageUrls, ...uploadedGallery, ...Object.values(nextColorImageUrls)])];
      const imageUrl = galleryImages[0] ?? null;
      const variants = matrix.combinations.map((optionValues, index) => {
        const key = JSON.stringify(optionValues);
        const fields = variantFields[key];
        return {
          sku: fields?.sku.trim() || (matrix.combinations.length === 1 && !matrix.options.length ? sku : `${sku}-${index + 1}`),
          price: Number(fields?.price || price),
          compare_at_price: fields?.compareAt ? Number(fields.compareAt) : null,
          barcode: fields?.barcode || null,
          inventory_quantity: Number(fields?.stock || 0),
          option_values: optionValues,
          image_url: colorOption ? nextColorImageUrls[optionValues[colorOption.name]] || null : null,
        };
      });
      await apiRequest(productId ? `/admin/products/${encodeURIComponent(productId)}` : "/admin/products", {
        method: productId ? "PUT" : "POST",
        body: JSON.stringify({
          title,
          sku,
          price: Number(price),
          stock_quantity: Number(stock),
          category,
          brand,
          description,
          image_url: imageUrl,
          images: galleryImages,
          options: matrix.options,
          variants,
        }),
      });
      toast.success(productId ? "Product updated." : "Product added to inventory.");
      onCreated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-product-title" className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between"><div><p className="eyebrow">Inventory</p><h2 id="add-product-title" className="mt-1 text-2xl font-bold">{productId ? "Edit product" : "Add product"}</h2></div><button aria-label="Close product editor" onClick={onClose} className="rounded-full p-2 hover:bg-neutral-100"><X className="h-5 w-5" /></button></header>
        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Product title<input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
          <label className="block text-sm font-medium">SKU<input required value={sku} onChange={(event) => setSku(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Price (ZAR)<input required min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="block text-sm font-medium">Stock quantity<input required min="0" step="1" type="number" value={stock} onChange={(event) => setStock(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
          </div>
          <label className="block text-sm font-medium">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3"><option>Streetwear</option><option>T-Shirts</option><option>Hoodies</option><option>Accessories</option><option>Wigs</option><option>Care</option><option>New Arrivals</option></select></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Brand<input value={brand} onChange={(event) => setBrand(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
            <label className="block text-sm font-medium">Product description / features<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3 py-2" /></label>
          </div>
          <section className="rounded-2xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Product gallery</h3><p className="mt-1 text-xs text-neutral-500">Add images together or in separate selections. The first image is the storefront cover.</p></div><label htmlFor="product-gallery-files" className="cursor-pointer rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">Add images</label></div>
            <input id="product-gallery-files" multiple accept="image/jpeg,image/png,image/webp,image/gif" type="file" onChange={(event) => { addGalleryImages(Array.from(event.target.files ?? [])); event.target.value = ""; }} className="sr-only" />
            <p className="mt-2 text-xs text-neutral-500">JPEG, PNG, WebP or GIF · max 5 MB each · {existingImageUrls.length + images.length}/20 images</p>
            {existingImageUrls.length + selectedImagePreviews.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {existingImageUrls.map((url, index) => <div key={url} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"><img src={url} alt={`Saved product image ${index + 1}`} className="aspect-square w-full object-contain" />{index === 0 && <span className="absolute left-2 top-2 rounded-full bg-black px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white">Cover</span>}<button type="button" aria-label={`Remove saved image ${index + 1}`} onClick={() => setExistingImageUrls((current) => current.filter((entry) => entry !== url))} className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow"><X className="h-3.5 w-3.5" /></button></div>)}
              {selectedImagePreviews.map(({ file, url }, index) => <div key={`${file.name}-${file.lastModified}`} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"><img src={url} alt={`New product image ${index + 1}`} className="aspect-square w-full object-contain" />{existingImageUrls.length === 0 && index === 0 && <span className="absolute left-2 top-2 rounded-full bg-black px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white">Cover</span>}<button type="button" aria-label={`Remove ${file.name}`} onClick={() => setImages((current) => current.filter((entry) => entry !== file))} className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow"><X className="h-3.5 w-3.5" /></button><p className="truncate px-2 py-1.5 text-[10px] text-neutral-600">{file.name}</p></div>)}
            </div> : <div className="mt-4 rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">No images yet. Choose “Add images” and select as many as you need.</div>}
          </section>
          <section className="rounded-2xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-semibold">Options and variants</h3><p className="mt-1 text-xs text-neutral-500">Enter comma-separated values. A SKU and stock row is generated for each combination.</p></div>
              {optionRows.length < 3 && <button type="button" onClick={() => setOptionRows((current) => [...current, { name: "", values: "" }])} className="rounded-full border border-neutral-300 px-3 py-2 text-xs font-medium">Add option</button>}
            </div>
            <div className="mt-4 space-y-3">
              {optionRows.map((option, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <input aria-label={`Option ${index + 1} name`} placeholder="Option name (e.g. Size)" value={option.name} onChange={(event) => setOptionRows((current) => current.map((entry, row) => row === index ? { ...entry, name: event.target.value } : entry))} className="h-10 rounded-lg border border-neutral-300 px-3 text-sm" />
                <input aria-label={`Option ${index + 1} values`} placeholder="Values, separated by commas" value={option.values} onChange={(event) => setOptionRows((current) => current.map((entry, row) => row === index ? { ...entry, values: event.target.value } : entry))} className="h-10 rounded-lg border border-neutral-300 px-3 text-sm" />
                <button type="button" aria-label={`Remove option ${index + 1}`} onClick={() => setOptionRows((current) => current.filter((_, row) => row !== index))} className="rounded-lg border border-neutral-300 px-3 text-sm text-neutral-500">Remove</button>
              </div>)}
            </div>
            {colorOption && <div className="mt-5 rounded-xl bg-neutral-50 p-4"><h4 className="text-sm font-semibold">Images by {colorOption.name}</h4><p className="mt-1 text-xs text-neutral-500">Assign one image to each colour. Every size using that colour will use the same image.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{colorOption.values.map((color) => <label key={color} className="rounded-xl border border-neutral-200 bg-white p-3 text-sm font-medium"><span className="flex items-center gap-2">{colorImageUrls[color] && <img src={colorImageUrls[color]} alt="" className="h-10 w-10 rounded-lg object-cover" />}{color}</span><input accept="image/jpeg,image/png,image/webp,image/gif" type="file" onChange={(event) => setColorImageFiles((current) => ({ ...current, [color]: event.target.files?.[0] ?? null }))} className="mt-2 block w-full text-xs file:mr-2 file:rounded-full file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5" /></label>)}</div></div>}
            {matrix.combinations.length > 0 && <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead className="bg-neutral-50 uppercase tracking-wider text-neutral-500"><tr>
                  {matrix.options.map((option) => <th key={option.name} className="px-3 py-2">{option.name}</th>)}
                  <th className="px-3 py-2">Price</th><th className="px-3 py-2">Compare at</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Barcode</th><th className="px-3 py-2">Stock</th>
                </tr></thead>
                <tbody className="divide-y divide-neutral-100">{matrix.combinations.map((combo, index) => {
                  const key = JSON.stringify(combo);
                  const fields = variantFields[key];
                  const skuValue = fields?.sku ?? (matrix.combinations.length === 1 && !matrix.options.length ? sku : `${sku}-${index + 1}`);
                  return <tr key={key}>
                    {matrix.options.map((option) => <td key={option.name} className="px-3 py-2 font-medium">{combo[option.name]}</td>)}
                    <td className="px-2 py-2"><input aria-label={`Variant ${index + 1} price`} type="number" min="0" step="0.01" value={fields?.price ?? price} onChange={(event) => updateVariantField(key, "price", event.target.value)} className="h-9 w-24 rounded-md border border-neutral-300 px-2" /></td>
                    <td className="px-2 py-2"><input aria-label={`Variant ${index + 1} compare-at price`} type="number" min="0" step="0.01" value={fields?.compareAt ?? ""} onChange={(event) => updateVariantField(key, "compareAt", event.target.value)} className="h-9 w-24 rounded-md border border-neutral-300 px-2" /></td>
                    <td className="px-2 py-2"><input required aria-label={`Variant ${index + 1} SKU`} value={skuValue} onChange={(event) => updateVariantField(key, "sku", event.target.value)} className="h-9 w-28 rounded-md border border-neutral-300 px-2" /></td>
                    <td className="px-2 py-2"><input aria-label={`Variant ${index + 1} barcode`} value={fields?.barcode ?? ""} onChange={(event) => updateVariantField(key, "barcode", event.target.value)} className="h-9 w-28 rounded-md border border-neutral-300 px-2" /></td>
                    <td className="px-2 py-2"><input required aria-label={`Variant ${index + 1} stock`} type="number" min="0" step="1" value={fields?.stock ?? (matrix.options.length ? "0" : stock)} onChange={(event) => updateVariantField(key, "stock", event.target.value)} className="h-9 w-20 rounded-md border border-neutral-300 px-2" /></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>}
            {matrix.tooMany && <p role="alert" className="mt-3 text-sm text-red-700">This option combination exceeds the 100-variant limit. Remove some values before saving.</p>}
          </section>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={saving || loadingProduct || Boolean(error) || matrix.tooMany} className="btn-primary w-full disabled:opacity-60">{loadingProduct ? "Loading product…" : saving ? "Saving…" : productId ? "Save changes" : "Save product"}</button>
        </form>
      </section>
    </div>
  );
}

const importFields = importFieldDefinitions.map(([key, label]) => ({ key, label }));

function ImportProductsPanel({ onImported, suppliers }: { onImported: () => void; suppliers: Supplier[] }) {
  const [source, setSource] = useState<"json" | "csv">("json");
  const [jsonText, setJsonText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>(() => suggestedMapping(importFieldDefinitions.map(([key]) => key)));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetchingSupplier, setFetchingSupplier] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierNotice, setSupplierNotice] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [supplierCategories, setSupplierCategories] = useState<SupplierCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [searchResults, setSearchResults] = useState<SupplierSearchProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [directQuery, setDirectQuery] = useState("");
  const [directLoading, setDirectLoading] = useState(false);
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [result, setResult] = useState<{ imported_count: number; skipped_count: number; skipped: { title: string; sku: string; reason: string }[] } | null>(null);
  const availableSuppliers = useMemo(() => suppliers.filter((supplier) => {
    if (!supplier.is_active) return false;
    if (supplier.adapter === "cj") return supplier.has_api_key;
    if (supplier.adapter === "eprolo") return supplier.has_api_key && supplier.has_api_secret;
    return true;
  }), [suppliers]);
  const selectedSupplier = useMemo(() => availableSuppliers.find((supplier) => supplier.id === selectedSupplierId), [availableSuppliers, selectedSupplierId]);

  useEffect(() => {
    if (!availableSuppliers.some((supplier) => supplier.id === selectedSupplierId)) {
      setSelectedSupplierId(availableSuppliers[0]?.id || "");
    }
  }, [availableSuppliers, selectedSupplierId]);

  useEffect(() => {
    let cancelled = false;
    setSelectedCategoryId("");
    setSupplierCategories([]);
    setCategoryError("");
    if (!selectedSupplierId) {
      setCategoriesLoading(false);
      return () => { cancelled = true; };
    }
    setCategoriesLoading(true);
    apiRequest<{ categories: SupplierCategory[] }>(`/admin/suppliers/${encodeURIComponent(selectedSupplierId)}/categories`)
      .then(({ categories }) => { if (!cancelled) setSupplierCategories(categories); })
      .catch((reason: Error) => { if (!cancelled) setCategoryError(reason.message || "Categories could not be loaded."); })
      .finally(() => { if (!cancelled) setCategoriesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSupplierId]);

  function loadRecords(nextRecords: Record<string, unknown>[], nextHeaders?: string[]) {
    if (nextRecords.length > 50) throw new Error("Imports are limited to 50 products per batch.");
    if (nextRecords.some((record) => !record || typeof record !== "object" || Array.isArray(record))) {
      throw new Error("Every product in the import must be a JSON object.");
    }
    const available = nextHeaders?.length ? nextHeaders : [...new Set(nextRecords.flatMap((record) => Object.keys(record)))];
    if (!available.length) throw new Error("No fields were found in this import.");
    setRecords(nextRecords);
    setHeaders(available);
    setMapping((current) => {
      const suggested = suggestedMapping(available);
      return Object.fromEntries(importFields.map(({ key }) => [key, available.includes(current[key]) ? current[key] : suggested[key]])) as ImportMapping;
    });
    setResult(null);
  }

  function readJson() {
    try {
      const parsed: unknown = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as { products?: unknown }).products)
        ? (parsed as { products: unknown[] }).products : null;
      if (!items) throw new Error("Provide a JSON array of products or an object with a products array.");
      loadRecords(items as Record<string, unknown>[]);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not parse product JSON.");
    }
  }

  async function readJsonFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("JSON files must be 2 MB or smaller.");
      const text = await file.text();
      setJsonText(text);
      const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
      const items = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as { products?: unknown }).products) ? (parsed as { products: unknown[] }).products : null;
      if (!items) throw new Error("Provide a JSON array of products or an object with a products array.");
      loadRecords(items as Record<string, unknown>[]);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not parse product JSON."); }
  }

  async function readCsv(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("CSV files must be 2 MB or smaller.");
      const parsed = parseCsv(await file.text());
      loadRecords(parsed.rows, parsed.headers);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not parse CSV.");
    }
  }

  async function fetchSupplierProducts() {
    if (!selectedSupplierId) {
      setError("Connect and enable a supplier before fetching products.");
      return;
    }
    setFetchingSupplier(true);
    setError("");
    setSupplierNotice("");
    try {
      const response = await apiRequest<{
        supplier: { id: string; name: string; adapter: Supplier["adapter"] };
        products: SupplierSearchProduct[];
      }>(`/admin/suppliers/${encodeURIComponent(selectedSupplierId)}/fetch-products`, {
        method: "POST",
        body: JSON.stringify({ action: "search", keyword: searchKeyword.trim(), category_id: selectedCategoryId }),
      });
      if (!response.products.length) throw new Error(`No products from ${response.supplier.name} matched those filters.`);
      setSearchResults(response.products);
      setSelectedProductIds(new Set());
      setSelectionOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not fetch supplier products.");
    } finally {
      setFetchingSupplier(false);
    }
  }

  function populateSupplierFeed(products: Record<string, unknown>[], supplierName: string, warnings: string[] = []) {
    setSource("json");
    setJsonText(JSON.stringify(products, null, 2));
    loadRecords(products);
    setSelectionOpen(false);
    const warning = warnings.length ? ` ${warnings.join(" ")}` : "";
    setSupplierNotice(`${products.length} selected product${products.length === 1 ? "" : "s"} from ${supplierName} added to the JSON feed and mapped for import.${warning}`);
    toast.success(`${products.length} supplier product${products.length === 1 ? " is" : "s are"} ready to import.`);
  }

  async function addSelectedToJsonFeed() {
    if (!selectedSupplierId || !selectedProductIds.size) return;
    setLoadingSelected(true);
    setError("");
    try {
      const response = await apiRequest<{
        supplier: { name: string };
        products: Record<string, unknown>[];
        warnings: string[];
      }>(`/admin/suppliers/${encodeURIComponent(selectedSupplierId)}/fetch-products`, {
        method: "POST",
        body: JSON.stringify({ action: "details", product_ids: [...selectedProductIds] }),
      });
      const nextHeaders = [...new Set(response.products.flatMap((product) => Object.keys(product)))];
      setSource("json");
      setJsonText(JSON.stringify(response.products, null, 2));
      loadRecords(response.products, nextHeaders);
      setSelectionOpen(false);
      const imported = await submitImportProducts(buildImportProducts(response.products, suggestedMapping(nextHeaders)));
      if (imported) {
        const warning = response.warnings.length ? ` ${response.warnings.join(" ")}` : "";
        setSupplierNotice(`${imported.imported_count} product${imported.imported_count === 1 ? "" : "s"} from ${response.supplier.name} imported into inventory.${warning}`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the selected products.");
      setSelectionOpen(false);
    } finally {
      setLoadingSelected(false);
    }
  }

  async function importDirectProduct() {
    if (!selectedSupplierId || !directQuery.trim()) {
      setError("Enter a CJ Product ID or SKU.");
      return;
    }
    setDirectLoading(true);
    setError("");
    setSupplierNotice("");
    try {
      const response = await apiRequest<{
        supplier: { name: string };
        products: Record<string, unknown>[];
        warnings: string[];
      }>(`/admin/suppliers/${encodeURIComponent(selectedSupplierId)}/fetch-products`, {
        method: "POST",
        body: JSON.stringify({ action: "direct", query: directQuery.trim() }),
      });
      populateSupplierFeed(response.products, response.supplier.name, response.warnings);
      setDirectQuery("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not fetch that CJ product.");
    } finally {
      setDirectLoading(false);
    }
  }

  function toggleSelectedProduct(productId: string) {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function submitImportProducts(products: Record<string, unknown>[]) {
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ job_id: string; status: string }>("/admin/products/import", {
        method: "POST",
        body: JSON.stringify({ products }),
      });
      setJobId(response.job_id);
      setJobStatus(response.status);
      setResult(null);
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const job = await apiRequest<{
          status: "pending" | "processing" | "completed" | "failed";
          result: { imported: { id: string; title: string; sku: string }[]; skipped: { title: string; sku: string; reason: string }[] } | null;
          error: string | null;
        }>(`/admin/products/import/${encodeURIComponent(response.job_id)}`);
        setJobStatus(job.status);
        if (job.status === "failed") {
          setJobId("");
          throw new Error(job.error || "The background import failed.");
        }
        if (job.status === "completed" && job.result) {
          const completed = {
            imported_count: job.result.imported.length,
            skipped_count: job.result.skipped.length,
            skipped: job.result.skipped,
          };
          setResult(completed);
          setJobId("");
          onImported();
          if (completed.imported_count) toast.success(`${completed.imported_count} product${completed.imported_count === 1 ? "" : "s"} imported.`);
          if (completed.skipped_count) toast.message(`${completed.skipped_count} duplicate product${completed.skipped_count === 1 ? "" : "s"} skipped.`);
          return completed;
        }
      }
      toast.message("The import is still processing in the background. Check its status in a moment.");
      return null;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product import failed.");
      setJobId("");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function importRecords() {
    try {
      await submitImportProducts(buildImportProducts(records, mapping));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product import failed.");
    }
  }

  async function refreshImportStatus() {
    if (!jobId) return;
    setBusy(true);
    setError("");
    try {
      const job = await apiRequest<{
        status: "pending" | "processing" | "completed" | "failed";
        result: { imported: { id: string; title: string; sku: string }[]; skipped: { title: string; sku: string; reason: string }[] } | null;
        error: string | null;
      }>(`/admin/products/import/${encodeURIComponent(jobId)}`);
      setJobStatus(job.status);
      if (job.status === "failed") {
        setJobId("");
        throw new Error(job.error || "The background import failed.");
      }
      if (job.status === "completed" && job.result) {
        setResult({
          imported_count: job.result.imported.length,
          skipped_count: job.result.skipped.length,
          skipped: job.result.skipped,
        });
        setJobId("");
        onImported();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not check import status.");
    } finally {
      setBusy(false);
    }
  }

  return (<>
    <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Import products</h2>
        <p className="mt-1 text-sm text-neutral-500">Map a JSON or CSV feed into your Elovyn catalog. Batches are validated and duplicates are reported rather than overwritten.</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {(["json", "csv"] as const).map((format) => <button key={format} type="button" onClick={() => { setSource(format); setRecords([]); setResult(null); setError(""); }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${source === format ? "bg-neutral-950 text-white" : "border border-neutral-300"}`}>{format.toUpperCase()}</button>)}
        </div>
        {!availableSuppliers.length && <p className="mt-2 text-xs text-amber-700">Add and enable a supplier in the Suppliers view before fetching products.</p>}
        <section className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-white p-2 shadow-sm"><Search className="h-4 w-4" /></span>
            <div><h3 className="text-sm font-semibold">Search connected supplier products</h3><p className="mt-0.5 text-xs text-neutral-500">Search first, choose exact products, then add only your selections to the JSON feed.</p></div>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void fetchSupplierProducts(); }} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-neutral-600">Supplier
              <select aria-label="Supplier to search" value={selectedSupplierId} onChange={(event) => setSelectedSupplierId(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-950">
                {!availableSuppliers.length && <option value="">No connected suppliers</option>}
                {availableSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-neutral-600">Search keywords / Product SKU
              <input value={searchKeyword} maxLength={200} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="hoodie, sneakers, or CJ SKU"
                className="mt-1 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-950" />
            </label>
            <label className="text-xs font-medium text-neutral-600">Category
              <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} disabled={!selectedSupplierId || categoriesLoading}
                className="mt-1 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-950 disabled:bg-neutral-100">
                <option value="">{categoriesLoading ? "Loading categories…" : "All categories"}</option>
                {supplierCategories.map((category) => <option key={category.id} value={category.id}>{category.group ? `${category.group} — ` : ""}{category.name}</option>)}
              </select>
            </label>
            <button disabled={!selectedSupplierId || fetchingSupplier || busy} className="btn-primary mt-auto inline-flex h-11 items-center justify-center gap-2 disabled:opacity-50">
              <ArrowDownToLine className="h-4 w-4" /> {fetchingSupplier ? "Searching supplier…" : "Fetch products from connected suppliers"}
            </button>
          </form>
          {categoryError && <p className="mt-2 text-xs text-amber-700">Categories unavailable: {categoryError} You can still search by keyword or SKU.</p>}
          {selectedSupplier?.adapter === "cj" && <form onSubmit={(event) => { event.preventDefault(); void importDirectProduct(); }} className="mt-4 border-t border-neutral-200 pt-4">
            <label className="text-xs font-medium text-neutral-600">Quick import by exact CJ Product ID or SKU</label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input value={directQuery} maxLength={200} onChange={(event) => setDirectQuery(event.target.value)} placeholder="Paste a CJ Product ID or SKU"
                className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-950" />
              <button disabled={!directQuery.trim() || directLoading} className="btn-secondary h-11 whitespace-nowrap disabled:opacity-50">{directLoading ? "Loading exact product…" : "Add exact product to JSON"}</button>
            </div>
          </form>}
        </section>
        {source === "json" ? <>
          <label htmlFor="import-json" className="mt-4 block text-sm font-medium">Product data (JSON)</label>
          <input type="file" accept=".json,application/json" onChange={(event) => void readJsonFile(event.target.files?.[0])} className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2" />
          <textarea id="import-json" value={jsonText} onChange={(event) => setJsonText(event.target.value)} rows={9}
            placeholder={'[{"title":"Everyday Tee","sku":"TEE-001","price":299,"stock_quantity":12}]'}
            className="mt-2 w-full rounded-xl border border-neutral-300 p-3 font-mono text-xs" />
          <button type="button" onClick={readJson} className="btn-secondary mt-3">Read JSON and map fields</button>
        </> : <>
          <label htmlFor="import-csv" className="mt-5 block text-sm font-medium">CSV product feed</label>
          <input id="import-csv" type="file" accept=".csv,text/csv" onChange={(event) => void readCsv(event.target.files?.[0])}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2" />
          <p className="mt-2 text-xs text-neutral-500">Maximum 2 MB and 50 products. CSV values for Options and Variants should be JSON arrays.</p>
        </>}
        {supplierNotice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{supplierNotice}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {jobId && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
          <p>Import {jobStatus || "pending"} · <span className="font-mono text-xs">{jobId}</span></p>
          <button type="button" disabled={busy} onClick={() => void refreshImportStatus()} className="font-semibold underline disabled:opacity-50">Check status</button>
        </div>}
        {result && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Import complete: {result.imported_count} added, {result.skipped_count} skipped.</p>
          {result.skipped.map((item) => <p key={`${item.sku}-${item.reason}`} className="mt-2 text-xs">{item.sku} — {item.reason}</p>)}
        </div>}
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Field mapping</h2><p className="mt-1 text-sm text-neutral-500">{records.length ? `${records.length} product rows ready` : "Read a JSON or CSV file to configure source fields."}</p></div>
          <button type="button" disabled={!records.length || busy || Boolean(jobId)} onClick={() => void importRecords()} className="btn-primary disabled:opacity-50">
            {busy ? "Importing…" : jobId ? "Import in progress" : "Import products"}
          </button>
        </div>
        <div className="mt-5 space-y-2">
          {importFields.map(({ key, label }) => <label key={key} className="grid items-center gap-2 text-sm sm:grid-cols-[1fr_1fr]">
            <span className="font-medium">{label}</span>
            <select value={mapping[key]} disabled={!headers.length} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))}
              className="h-10 rounded-lg border border-neutral-300 bg-white px-3 disabled:bg-neutral-50">
              <option value="">Not mapped</option>
              {headers.map((header) => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>)}
        </div>
      </section>
    </div>
    {selectionOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target && !loadingSelected) setSelectionOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="supplier-results-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-7">
          <div>
            <h2 id="supplier-results-title" className="text-lg font-semibold">Choose products to import</h2>
            <p className="mt-1 text-sm text-neutral-500">{searchResults.length} matching products · {selectedProductIds.size} selected · prices supplied by {selectedSupplier?.name || "the supplier"}</p>
          </div>
          <button type="button" disabled={loadingSelected} onClick={() => setSelectionOpen(false)} aria-label="Close product selection" className="rounded-full border border-neutral-200 p-2 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3 text-sm sm:px-7">
          <button type="button" onClick={() => setSelectedProductIds(selectedProductIds.size === searchResults.length ? new Set() : new Set(searchResults.map((product) => product.id)))} className="font-semibold underline underline-offset-4">
            {selectedProductIds.size === searchResults.length ? "Clear selection" : "Select all results"}
          </button>
          <span className="text-neutral-500">Select up to 20 products</span>
        </div>
        <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3 xl:grid-cols-4">
          {searchResults.map((product) => {
            const selected = selectedProductIds.has(product.id);
            const selectionLimitReached = selectedProductIds.size >= 20 && !selected;
            return <label key={product.id} className={`relative cursor-pointer overflow-hidden rounded-2xl border bg-white transition ${selected ? "border-neutral-950 ring-2 ring-neutral-950" : "border-neutral-200 hover:border-neutral-400"} ${selectionLimitReached ? "cursor-not-allowed opacity-50" : ""}`}>
              <input type="checkbox" checked={selected} disabled={selectionLimitReached || loadingSelected} onChange={() => toggleSelectedProduct(product.id)} className="absolute right-3 top-3 z-10 h-5 w-5 accent-black" aria-label={`Select ${product.title}`} />
              <div className="aspect-square bg-neutral-100">
                {product.image_url ? <img src={product.image_url} alt="" loading="lazy" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-neutral-400"><PackagePlus className="h-8 w-8" /></div>}
              </div>
              <div className="p-4">
                <p className="line-clamp-2 min-h-10 text-sm font-semibold">{product.title}</p>
                <p className="mt-1 truncate text-xs text-neutral-500">{product.sku}</p>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <span className="text-sm font-semibold">{product.currency ? `${product.currency} ` : ""}{Number(product.price).toFixed(2)}</span>
                  {product.category && <span className="max-w-28 truncate text-[11px] text-neutral-500">{product.category}</span>}
                </div>
              </div>
            </label>;
          })}
        </div>
        <footer className="flex flex-col-reverse gap-3 border-t border-neutral-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
          <button type="button" disabled={loadingSelected} onClick={() => setSelectionOpen(false)} className="btn-secondary disabled:opacity-50">Cancel</button>
          <button type="button" disabled={!selectedProductIds.size || loadingSelected || busy} onClick={() => void addSelectedToJsonFeed()} className="btn-primary disabled:opacity-50">
            {loadingSelected || busy ? "Importing into inventory…" : `Import ${selectedProductIds.size || ""} Selected to Inventory`}
          </button>
        </footer>
      </section>
    </div>}
  </>);
}
