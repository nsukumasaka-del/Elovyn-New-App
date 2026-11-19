import { useEffect, useState, type FormEvent } from "react";
import { Star, X } from "lucide-react";
import { apiRequest } from "@/lib/store-api";

type EligibleOrder = { order_id: string; order_number: string | null };
type SiteReview = { id: string; customer_name: string; rating: number; comment: string; created_at: string };

export function SiteReviewPrompt({ orderId }: { orderId?: string }) {
  const [eligibleOrder, setEligibleOrder] = useState<EligibleOrder | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ eligible: boolean; eligible_order: (EligibleOrder & { customer_name: string | null }) | null }>(
      `/site-reviews/eligibility${orderId ? `?order_id=${encodeURIComponent(orderId)}` : ""}`,
    ).then((result) => {
      if (!active || !result.eligible_order) return;
      setEligibleOrder(result.eligible_order);
      setDismissed(localStorage.getItem(`elovyn-site-review-dismissed:${result.eligible_order.order_id}`) === "true");
    }).catch(() => {
      if (active) setEligibleOrder(null);
    });
    return () => { active = false; };
  }, [orderId]);

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!eligibleOrder) return;
    setSubmitting(true);
    setError("");
    try {
      await apiRequest("/site-reviews", {
        method: "POST",
        body: JSON.stringify({ order_id: eligibleOrder.order_id, rating, comment }),
      });
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!eligibleOrder || dismissed) return null;
  return <section aria-label="Review your shopping experience" className="relative rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <button type="button" onClick={() => {
      localStorage.setItem(`elovyn-site-review-dismissed:${eligibleOrder.order_id}`, "true");
      setDismissed(true);
    }} aria-label="Dismiss review prompt" className="absolute right-3 top-3 rounded-full p-1 text-neutral-500 hover:bg-amber-100"><X className="h-4 w-4" /></button>
    {submitted ? <div role="status"><h2 className="font-semibold text-neutral-950">Thanks for sharing your experience!</h2><p className="mt-1 text-sm text-neutral-600">Your feedback helps us improve elovyn.store.</p></div> : <>
      <h2 className="pr-8 font-semibold text-neutral-950">How was your experience shopping with us?</h2>
      <p className="mt-1 text-xs text-neutral-600">Order {eligibleOrder.order_number || eligibleOrder.order_id}</p>
      <form onSubmit={(event) => void submitReview(event)} className="mt-4 space-y-3">
        <div role="group" aria-label="Your rating" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} className="p-1 text-amber-500"><Star className={`h-6 w-6 ${value <= rating ? "fill-current" : ""}`} /></button>)}
        </div>
        <label className="block text-sm font-medium">Your feedback
          <textarea required maxLength={2000} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={submitting || !comment.trim()} className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Submitting…" : "Submit review"}</button>
      </form>
    </>}
  </section>;
}

export function SiteReviewsShowcase() {
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  useEffect(() => {
    let active = true;
    apiRequest<{ reviews: SiteReview[] }>("/site-reviews")
      .then((result) => { if (active) setReviews(Array.isArray(result?.reviews) ? result.reviews : []); })
      .catch(() => { if (active) setReviews([]); });
    return () => { active = false; };
  }, []);

  if (!reviews.length) return null;
  return <section className="section-shell py-10 sm:py-14">
    <div className="text-center"><p className="eyebrow">Loved by our community</p><h2 className="section-heading mt-3">Real experiences, shared.</h2></div>
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => <article key={review.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex gap-0.5 text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : ""}`} />)}</div>
        <p className="mt-3 text-sm leading-6 text-neutral-700">{review.comment}</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">{review.customer_name}</p>
      </article>)}
    </div>
  </section>;
}
