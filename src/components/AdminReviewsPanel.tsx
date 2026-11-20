import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/store-api";

type ProductReview = {
  id: string;
  product_id: string;
  product_title: string;
  order_id: string;
  order_number: string | null;
  customer_name: string;
  rating: number;
  title: string | null;
  comment: string;
  images: string;
  status: "published" | "hidden";
  created_at: string;
};
type StoreReview = {
  id: string;
  order_id: string | null;
  order_number: string | null;
  customer_name: string;
  rating: number;
  comment: string;
  is_featured: boolean;
  created_at: string;
};

export function AdminReviewsPanel() {
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [siteReviews, setSiteReviews] = useState<StoreReview[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadReviews() {
    setLoading(true);
    try {
      const result = await apiRequest<{ product_reviews: ProductReview[]; site_reviews: StoreReview[] }>("/admin/reviews");
      setProductReviews(result.product_reviews);
      setSiteReviews(result.site_reviews);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadReviews(); }, []);

  async function updateProductReview(review: ProductReview, status: ProductReview["status"]) {
    try {
      await apiRequest(`/admin/reviews/product/${encodeURIComponent(review.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setProductReviews((current) => current.map((entry) => entry.id === review.id ? { ...entry, status } : entry));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update product review."); }
  }

  async function deleteReview(kind: "product" | "site", id: string) {
    if (!window.confirm("Permanently delete this review? This cannot be undone.")) return;
    try {
      await apiRequest(`/admin/reviews/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (kind === "product") setProductReviews((current) => current.filter((entry) => entry.id !== id));
      else setSiteReviews((current) => current.filter((entry) => entry.id !== id));
      toast.success("Review deleted.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete review."); }
  }

  async function featureReview(review: StoreReview, isFeatured: boolean) {
    try {
      await apiRequest(`/admin/reviews/site/${encodeURIComponent(review.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ is_featured: isFeatured }),
      });
      setSiteReviews((current) => current.map((entry) => entry.id === review.id ? { ...entry, is_featured: isFeatured } : entry));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update store review."); }
  }

  return <div className="space-y-6">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Product reviews</h2><p className="mt-1 text-sm text-neutral-500">Hide or remove customer reviews on product pages.</p></div><button type="button" onClick={() => void loadReviews()} className="text-sm underline">Refresh</button></div>
      {loading ? <p className="py-8 text-center text-sm text-neutral-500">Loading reviews…</p> : productReviews.length === 0 ? <p className="py-8 text-center text-sm text-neutral-500">No product reviews yet.</p> : <div className="divide-y divide-neutral-100">
        {productReviews.map((review) => <article key={review.id} className="py-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{review.title || review.product_title} <span className="text-amber-600">{"★".repeat(review.rating)}</span></p><p className="mt-1 text-xs text-neutral-500">{review.customer_name} · {review.product_title} · {review.order_number || review.order_id}</p></div><div className="flex gap-2"><button type="button" onClick={() => void updateProductReview(review, review.status === "published" ? "hidden" : "published")} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium">{review.status === "published" ? "Hide" : "Publish"}</button><button type="button" onClick={() => void deleteReview("product", review.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700">Delete</button></div></div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{review.comment}</p>
          {(() => {
            let images: unknown;
            try { images = JSON.parse(review.images); } catch { images = []; }
            return Array.isArray(images) && images.some((image) => typeof image === "string")
              ? <div className="mt-3 flex flex-wrap gap-2">{images.filter((image): image is string => typeof image === "string").map((image, index) => <a key={`${review.id}-${index}`} href={image} target="_blank" rel="noreferrer" aria-label="Open customer review photo"><img src={image} alt={`Review photo ${index + 1}`} className="h-16 w-16 rounded-lg border border-neutral-200 object-cover" /></a>)}</div>
              : null;
          })()}
        </article>)}
      </div>}
    </section>
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4"><h2 className="font-semibold">Store reviews</h2><p className="mt-1 text-sm text-neutral-500">Choose which buyer experiences appear as storefront social proof.</p></div>
      {loading ? <p className="py-8 text-center text-sm text-neutral-500">Loading reviews…</p> : siteReviews.length === 0 ? <p className="py-8 text-center text-sm text-neutral-500">No store reviews yet.</p> : <div className="divide-y divide-neutral-100">
        {siteReviews.map((review) => <article key={review.id} className="py-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{review.customer_name} <span className="text-amber-600">{"★".repeat(review.rating)}</span></p><p className="mt-1 text-xs text-neutral-500">{review.order_number || "Order removed"} · {new Date(review.created_at).toLocaleDateString()}</p></div><div className="flex gap-2"><button type="button" onClick={() => void featureReview(review, !review.is_featured)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium">{review.is_featured ? "Unfeature" : "Feature"}</button><button type="button" onClick={() => void deleteReview("site", review.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700">Delete</button></div></div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{review.comment}</p>
        </article>)}
      </div>}
    </section>
  </div>;
}
