import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, LayoutDashboard, PackagePlus, Pencil, Settings2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest, isPrimaryAdmin, type StoreUser } from "@/lib/store-api";
import { useStore } from "@/lib/store";
import { buildImportProducts, importFieldDefinitions, parseCsv, suggestedMapping, type ImportField, type ImportMapping } from "@/lib/product-import";

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
  adapter: "cj" | "generic_json";
  field_mapping_json: string;
  connection_status: "pending" | "connected" | "error";
  last_sync_at: string | null;
  last_sync_error: string | null;
};
type VariantFields = { sku: string; price: string; compareAt: string; barcode: string; stock: string };

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
  const [autoSync, setAutoSync] = useState(false);
  const [supplierAdapter, setSupplierAdapter] = useState<"cj" | "generic_json">("cj");
  const [fieldMapping, setFieldMapping] = useState("{}");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [syncingSupplierId, setSyncingSupplierId] = useState("");

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
    setSavingSupplier(true);
    try {
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
          auto_sync: autoSync,
          adapter: supplierAdapter,
          field_mapping: parsedMapping,
        }),
      });
      setSupplierId("");
      setSupplierName("");
      setApiBaseUrl("");
      setWebhookUrl("");
      setApiKey("");
      setAutoSync(false);
      setSupplierAdapter("cj");
      setFieldMapping("{}");
      await loadData();
      toast.success(`Supplier saved and synchronized: ${response.sync.imported} added, ${response.sync.updated} updated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save supplier.");
    } finally { setSavingSupplier(false); }
  }

  function editSupplier(supplier: Supplier) {
    setSupplierId(supplier.id);
    setSupplierName(supplier.name);
    setApiBaseUrl(supplier.api_base_url ?? "");
    setWebhookUrl(supplier.webhook_url ?? "");
    setApiKey("");
    setAutoSync(supplier.auto_sync);
    setSupplierAdapter(supplier.adapter);
    setFieldMapping(supplier.field_mapping_json || "{}");
  }

  async function syncSupplier(id: string) {
    setSyncingSupplierId(id);
    try {
      const response = await apiRequest<{ sync: { imported: number; updated: number } }>(`/admin/suppliers/${encodeURIComponent(id)}/sync`, { method: "POST" });
      await loadData();
      toast.success(`Supplier sync complete: ${response.sync.imported} added, ${response.sync.updated} updated.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Supplier sync failed."); }
    finally { setSyncingSupplierId(""); }
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
                      <td className="px-4 py-4"><div className="flex gap-2">
                        <button aria-label={`Edit ${product.title}`} onClick={() => setEditProductId(product.id)} className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100"><Pencil className="h-4 w-4" /></button>
                        <button aria-label={`Decrease ${product.title} stock`} onClick={() => void changeStock(product, -1)} className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100"><ArrowDownToLine className="h-4 w-4" /></button>
                        <button aria-label={`Increase ${product.title} stock`} onClick={() => void changeStock(product, 1)} className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100"><ArrowUpFromLine className="h-4 w-4" /></button>
                      </div></td>
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
                  <label className="block text-sm font-medium">Integration type<select value={supplierAdapter} onChange={(event) => setSupplierAdapter(event.target.value as typeof supplierAdapter)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3"><option value="cj">CJ Dropshipping</option><option value="generic_json">JSON product feed</option></select></label>
                  <label className="block text-sm font-medium">Supplier name<input required value={supplierName} onChange={(event) => setSupplierName(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  <label className="block text-sm font-medium">{supplierAdapter === "cj" ? "API base URL (optional)" : "JSON feed URL"}<input type="url" value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder={supplierAdapter === "cj" ? "https://developers.cjdropshipping.com/api2.0/v1" : "https://supplier.example/products.json"} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  <label className="block text-sm font-medium">API key<input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={supplierId ? "Leave blank to keep the saved key" : "Enter API key"} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  <label className="block text-sm font-medium">Webhook URL<input type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://your-store.com/api/supplier-webhook" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
                  {supplierAdapter === "generic_json" && <label className="block text-sm font-medium">Field mapping (JSON)<textarea value={fieldMapping} onChange={(event) => setFieldMapping(event.target.value)} rows={5} placeholder={'{"title":"name","sku":"code","price":"retailPrice","stock_quantity":"inventory"}'} className="mt-1.5 w-full rounded-xl border border-neutral-300 p-3 font-mono text-xs" /><span className="mt-1 block text-xs font-normal text-neutral-500">Map Elovyn fields to dot-separated paths in each feed item.</span></label>}
                  <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={autoSync} onChange={(event) => setAutoSync(event.target.checked)} className="h-4 w-4 accent-neutral-950" />Enable automatic stock sync</label>
                  <button disabled={savingSupplier} className="btn-primary w-full disabled:opacity-60">{savingSupplier ? "Validating and syncing…" : "Save, validate & sync"}</button>
                </form>
              </section>
              <section className="space-y-3">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  Saving validates the credentials and immediately imports or updates up to 50 products. Use Sync now whenever you need a fresh inventory push.
                </div>
                {suppliers.length === 0 && <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">No supplier integrations configured.</div>}
                {suppliers.map((supplier) => (
                  <article key={supplier.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{supplier.name}</h3><p className="mt-1 text-sm text-neutral-500">{supplier.api_base_url || "No API URL configured"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs ${supplier.has_api_key ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>{supplier.has_api_key ? "Configured" : "Disconnected"}</span></div>
                    {supplier.last_sync_error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{supplier.last_sync_error}</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4"><span className="text-sm text-neutral-600">{supplier.connection_status} · {supplier.last_sync_at ? `last synced ${new Date(supplier.last_sync_at).toLocaleString()}` : "not synced"}</span><div className="flex gap-3"><button disabled={syncingSupplierId === supplier.id} onClick={() => void syncSupplier(supplier.id)} className="text-sm font-medium underline disabled:opacity-50">{syncingSupplierId === supplier.id ? "Syncing…" : "Sync now"}</button><button onClick={() => editSupplier(supplier)} className="text-sm font-medium underline">Edit</button></div></div>
                  </article>
                ))}
              </section>
            </div>
          )}

          {tab === "imports" && <ImportProductsPanel onImported={() => void loadData()} />}
        </main>
      </div>
      {addOpen && <AddProductDialog onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); void Promise.all([loadData(), refreshProducts()]); }} />}
      {editProductId && <AddProductDialog productId={editProductId} onClose={() => setEditProductId(null)} onCreated={() => { setEditProductId(null); void Promise.all([loadData(), refreshProducts()]); }} />}
    </div>
  );
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
          <label className="block text-sm font-medium">Product gallery<input multiple accept="image/jpeg,image/png,image/webp,image/gif" type="file" onChange={(event) => setImages(Array.from(event.target.files ?? []))} className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2" /><span className="mt-1 block text-xs text-neutral-500">Select multiple JPEG, PNG, WebP or GIF files · max 5 MB each · 20 images total{existingImageUrls.length ? ` · ${existingImageUrls.length} saved` : ""}{images.length ? ` · ${images.length} selected` : ""}</span></label>
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

function ImportProductsPanel({ onImported }: { onImported: () => void }) {
  const [source, setSource] = useState<"json" | "csv">("json");
  const [jsonText, setJsonText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>(() => suggestedMapping(importFieldDefinitions.map(([key]) => key)));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [result, setResult] = useState<{ imported_count: number; skipped_count: number; skipped: { title: string; sku: string; reason: string }[] } | null>(null);

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

  async function importRecords() {
    setBusy(true);
    setError("");
    try {
      const products = buildImportProducts(records, mapping);
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
          return;
        }
      }
      toast.message("The import is still processing in the background. Check its status in a moment.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Product import failed.");
      setJobId("");
    } finally {
      setBusy(false);
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

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Import products</h2>
        <p className="mt-1 text-sm text-neutral-500">Map a JSON or CSV feed into your Elovyn catalog. Batches are validated and duplicates are reported rather than overwritten.</p>
        <div className="mt-5 flex gap-2">
          {(["json", "csv"] as const).map((format) => <button key={format} type="button" onClick={() => { setSource(format); setRecords([]); setResult(null); setError(""); }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${source === format ? "bg-neutral-950 text-white" : "border border-neutral-300"}`}>{format.toUpperCase()}</button>)}
        </div>
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
  );
}
