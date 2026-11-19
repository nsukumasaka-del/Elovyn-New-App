import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/store-api";

export function FreeShippingEditor() {
  const { refreshStorefrontConfig } = useStore();
  const [threshold, setThreshold] = useState("1500");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ freeShippingThreshold: number }>("/admin/settings/shipping")
      .then(({ freeShippingThreshold }) => {
        if (active) setThreshold(String(freeShippingThreshold));
      })
      .catch((error: Error) => toast.error(`Could not load delivery settings: ${error.message}`))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    const value = Number(threshold);
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000) {
      toast.error("Enter a free-delivery threshold from R0 to R1,000,000.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest("/admin/settings/shipping", {
        method: "PUT",
        body: JSON.stringify({ free_shipping_threshold: value }),
      });
      await refreshStorefrontConfig();
      toast.success("Free-delivery threshold saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save delivery settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <p className="eyebrow">Delivery</p>
      <h2 className="mt-2 text-xl font-semibold">Free-delivery threshold</h2>
      <p className="mt-2 text-sm text-neutral-600">Orders at or above this subtotal receive free nationwide delivery.</p>
      <form onSubmit={(event) => void save(event)} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium">
          Threshold (ZAR)
          <div className="mt-2 flex h-11 items-center rounded-xl border border-neutral-300 px-3">
            <span className="mr-2 text-neutral-500">R</span>
            <input
              aria-label="Free-delivery threshold in ZAR"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
              disabled={loading || saving}
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className="w-36 bg-transparent outline-none disabled:opacity-60"
            />
          </div>
        </label>
        <button type="submit" disabled={loading || saving} className="btn-primary h-11 disabled:opacity-50">
          {saving ? "Saving…" : "Save delivery setting"}
        </button>
      </form>
    </section>
  );
}
