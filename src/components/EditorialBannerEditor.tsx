import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/store-api";
import { defaultEditorialBanner, type EditorialBanner } from "@/lib/editorial-banner";

export function EditorialBannerEditor() {
  const [banner, setBanner] = useState<EditorialBanner>(defaultEditorialBanner);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ editorialBanner: EditorialBanner }>("/admin/settings/editorial-banner")
      .then(({ editorialBanner }) => { if (active) setBanner({ ...defaultEditorialBanner, ...editorialBanner }); })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function setField<K extends keyof EditorialBanner>(key: K, value: EditorialBanner[K]) {
    setBanner((current) => ({ ...current, [key]: value }));
  }

  async function uploadBannerImage(file: File) {
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", file);
      const uploaded = await apiRequest<{ image_url: string }>("/admin/assets", { method: "POST", body: data });
      setField("imageUrl", uploaded.image_url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload the editorial banner image.");
    } finally { setUploading(false); }
  }

  async function saveBanner(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest<{ editorialBanner: EditorialBanner }>("/admin/settings/editorial-banner", {
        method: "PUT",
        body: JSON.stringify(banner),
      });
      setBanner(result.editorialBanner);
      toast.success("Editorial banner saved and published.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the editorial banner.");
    } finally { setSaving(false); }
  }

  return <form onSubmit={(event) => void saveBanner(event)} className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold">Editorial Banner</h2>
    <p className="mt-1 text-sm text-neutral-500">Edit the homepage “The Streetwear Edit” feature and preview changes before publishing.</p>
    {loading ? <p className="mt-5 text-sm text-neutral-500">Loading editorial banner…</p> : <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <label className="block text-sm font-medium">Eyebrow label<input maxLength={100} value={banner.eyebrow} onChange={(event) => setField("eyebrow", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
        <label className="block text-sm font-medium">Headline<input required maxLength={160} value={banner.headline} onChange={(event) => setField("headline", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
        <label className="block text-sm font-medium">Description<textarea maxLength={1000} rows={3} value={banner.description} onChange={(event) => setField("description", event.target.value)} className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3 py-2" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">Button label<input required maxLength={80} value={banner.buttonText} onChange={(event) => setField("buttonText", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
          <label className="block text-sm font-medium">Button destination URL<input value={banner.buttonLink} onChange={(event) => setField("buttonLink", event.target.value)} placeholder="/categories/streetwear" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
        </div>
        <label className="block text-sm font-medium">Image URL<input value={banner.imageUrl} onChange={(event) => setField("imageUrl", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
        <label className="inline-flex cursor-pointer rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium">{uploading ? "Uploading…" : "Upload banner image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBannerImage(file); event.target.value = ""; }} /></label>
      </div>
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 text-white">
        <div className="aspect-[4/3] bg-neutral-800">{banner.imageUrl && <img src={banner.imageUrl} alt="Editorial banner preview" className="h-full w-full object-cover" />}</div>
        <div className="p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">{banner.eyebrow}</p><h3 className="mt-2 text-2xl font-black">{banner.headline}</h3><p className="mt-2 text-sm text-white/70">{banner.description}</p><span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-950">{banner.buttonText}</span></div>
      </div>
    </div>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex justify-end"><button type="submit" disabled={loading || saving || uploading} className="btn-primary disabled:opacity-50">{saving ? "Saving…" : "Save Editorial Banner"}</button></div>
  </form>;
}
