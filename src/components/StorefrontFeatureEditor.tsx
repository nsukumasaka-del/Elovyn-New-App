import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/store-api";
import { defaultCategories, type StorefrontCategory } from "@/lib/categories";
import { defaultDualFeatureCards, type DualFeatureCard } from "@/lib/dual-feature-cards";
import { useStore } from "@/lib/store";
import hoodieImage from "@/assets/Hoodie.png";
import wigImage from "@/assets/WEAVE 1.jpg";

export function StorefrontFeatureEditor() {
  const { refreshStorefrontConfig, refreshProducts } = useStore();
  const [cards, setCards] = useState<DualFeatureCard[]>(defaultDualFeatureCards);
  const [categories, setCategories] = useState<StorefrontCategory[]>(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [savingCards, setSavingCards] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);
  const [uploadingCard, setUploadingCard] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ dualFeatureCards: DualFeatureCard[] }>("/admin/settings/dual-feature-cards"),
      apiRequest<{ categories: StorefrontCategory[] }>("/admin/settings/categories"),
    ]).then(([cardResult, categoryResult]) => {
      if (!active) return;
      setCards(cardResult.dualFeatureCards);
      setCategories(categoryResult.categories);
    }).catch((reason: Error) => {
      if (active) {
        setError(`Could not load storefront configuration: ${reason.message}`);
        setLoadFailed(true);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function setCard(index: number, patch: Partial<DualFeatureCard>) {
    setCards((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, ...patch } : card));
  }

  async function uploadImage(index: number, file: File) {
    setUploadingCard(index);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const result = await apiRequest<{ image_url: string }>("/admin/assets", { method: "POST", body });
      setCard(index, { imageUrl: result.image_url });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload the feature card image.");
    } finally {
      setUploadingCard(null);
    }
  }

  async function saveCards(event: FormEvent) {
    event.preventDefault();
    setSavingCards(true);
    setError("");
    try {
      const result = await apiRequest<{ dualFeatureCards: DualFeatureCard[] }>("/admin/settings/dual-feature-cards", {
        method: "PUT",
        body: JSON.stringify({ dualFeatureCards: cards }),
      });
      setCards(result.dualFeatureCards);
      await refreshStorefrontConfig();
      toast.success("Homepage feature cards saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the feature cards.");
    } finally {
      setSavingCards(false);
    }
  }

  async function saveCategories(event: FormEvent) {
    event.preventDefault();
    setSavingCategories(true);
    setError("");
    try {
      const result = await apiRequest<{ categories: StorefrontCategory[]; dualFeatureCards: DualFeatureCard[] }>("/admin/settings/categories", {
        method: "PUT",
        body: JSON.stringify({ categories }),
      });
      setCategories(result.categories);
      if (result.dualFeatureCards) setCards(result.dualFeatureCards);
      await Promise.all([refreshStorefrontConfig(), refreshProducts()]);
      toast.success("Storefront categories saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save storefront categories.");
    } finally {
      setSavingCategories(false);
    }
  }

  function updateCategory(index: number, patch: Partial<StorefrontCategory>) {
    setCategories((current) => current.map((category, categoryIndex) => categoryIndex === index
      ? { ...category, ...patch }
      : category));
  }

  function reorderCategory(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= categories.length) return;
    setCategories((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addCategory() {
    let suffix = 1;
    let slug = "new-category";
    while (categories.some((category) => category.slug === slug)) {
      suffix += 1;
      slug = `new-category-${suffix}`;
    }
    setCategories((current) => [...current, {
      id: crypto.randomUUID(),
      slug,
      name: "New category",
      description: "",
      active: true,
    }]);
  }

  return <section className="mt-6 space-y-6">
    <form onSubmit={(event) => void saveCards(event)} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Dual Feature Cards</h2>
      <p className="mt-1 text-sm text-neutral-500">Edit the two homepage showcase cards. Use the existing image upload or paste a public image URL.</p>
      {loading ? <p className="mt-5 text-sm text-neutral-500">Loading feature cards and categories…</p> : <>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {cards.map((card, index) => <fieldset key={card.id} className="min-w-0 rounded-xl border border-neutral-200 p-4">
            <legend className="px-2 text-sm font-semibold">Card {index + 1} ({index === 0 ? "Left" : "Right"})</legend>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-3">
                <label className="block text-sm font-medium">Eyebrow / category label<input maxLength={100} value={card.eyebrow} onChange={(event) => setCard(index, { eyebrow: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3" /></label>
                <label className="block text-sm font-medium">Headline<input required maxLength={160} value={card.headline} onChange={(event) => setCard(index, { headline: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3" /></label>
                <label className="block text-sm font-medium">Description<textarea maxLength={1000} rows={3} value={card.description} onChange={(event) => setCard(index, { description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label>
                <label className="block text-sm font-medium">Button label<input required maxLength={80} value={card.buttonText} onChange={(event) => setCard(index, { buttonText: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3" /></label>
                <label className="block text-sm font-medium">Target category<select required value={card.categorySlug} onChange={(event) => setCard(index, { categorySlug: event.target.value, buttonLink: `/categories/${event.target.value}` })} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 bg-white px-3">
                  {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}{category.active ? "" : " (hidden)"}</option>)}
                </select></label>
                <label className="block text-sm font-medium">Button destination URL<input value={card.buttonLink} onChange={(event) => setCard(index, { buttonLink: event.target.value })} placeholder={`/categories/${card.categorySlug}`} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3" /></label>
                <label className="block text-sm font-medium">Image URL<input value={card.imageUrl} onChange={(event) => setCard(index, { imageUrl: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3" /></label>
                <label className="inline-flex cursor-pointer rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium">{uploadingCard === index ? "Uploading…" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingCard !== null} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(index, file); event.target.value = ""; }} /></label>
              </div>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                <div className="aspect-[3/4]"><img src={card.imageUrl || (index === 0 ? hoodieImage : wigImage)} alt={`${card.eyebrow} preview`} className="h-full w-full object-cover" /></div>
                <div className="space-y-2 bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{card.eyebrow || "Category"}</p><p className="font-bold">{card.headline || "Feature headline"}</p><p className="text-xs text-neutral-600">{card.description}</p><span className="inline-block rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-medium text-white">{card.buttonText || "Button"}</span></div>
              </div>
            </div>
          </fieldset>)}
        </div>
        <div className="mt-5 flex justify-end"><button type="submit" disabled={loading || loadFailed || savingCards || uploadingCard !== null} className="btn-primary disabled:opacity-50">{savingCards ? "Saving…" : "Save Feature Cards"}</button></div>
      </>}
    </form>

    <form onSubmit={(event) => void saveCategories(event)} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Storefront Categories</h2><p className="mt-1 text-sm text-neutral-500">Edit names and order, add categories, or hide categories from navigation and the homepage.</p></div><button type="button" onClick={addCategory} className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold"><Plus className="h-4 w-4" />Add category</button></div>
      {loading ? <p className="mt-5 text-sm text-neutral-500">Loading categories…</p> : <div className="mt-5 space-y-3">
        {categories.map((category, index) => <fieldset key={category.id} className="grid gap-3 rounded-xl border border-neutral-200 p-4 lg:grid-cols-[1fr_1fr_2fr_auto_auto] lg:items-end">
          <label className="text-sm font-medium">Name<input required maxLength={100} value={category.name} onChange={(event) => updateCategory(index, { name: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3" /></label>
          <label className="text-sm font-medium">URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={category.slug} onChange={(event) => updateCategory(index, { slug: event.target.value.toLowerCase() })} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3" /></label>
          <label className="text-sm font-medium">Description<input maxLength={500} value={category.description} onChange={(event) => updateCategory(index, { description: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-300 px-3" /></label>
          <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={category.active} onChange={(event) => updateCategory(index, { active: event.target.checked })} />Visible</label>
          <div className="flex gap-1">
            <button type="button" aria-label={`Move ${category.name} up`} disabled={index === 0} onClick={() => reorderCategory(index, -1)} className="rounded-lg border border-neutral-300 p-2 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label={`Move ${category.name} down`} disabled={index === categories.length - 1} onClick={() => reorderCategory(index, 1)} className="rounded-lg border border-neutral-300 p-2 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
          </div>
        </fieldset>)}
      </div>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end"><button type="submit" disabled={loading || loadFailed || savingCategories || savingCards} className="btn-primary disabled:opacity-50">{savingCategories ? "Saving…" : "Save Categories"}</button></div>
    </form>
  </section>;
}
