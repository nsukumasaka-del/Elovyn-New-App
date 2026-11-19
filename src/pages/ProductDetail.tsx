import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ChevronRight, Star, Truck } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { apiRequest } from "@/lib/store-api";
import productFallback from "@/assets/CLOTHING.jpg";

type ProductOption = { id: string; name: string; values_json: string; position: number };
type ProductVariant = {
  id: string;
  title: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  options_json: string;
  image_url: string | null;
  inventory_quantity: number;
  track_quantity: boolean;
};
type ProductDetailData = {
  product: {
    id: string;
    title: string;
    sku: string;
    price: number;
    compare_at_price: number | null;
    stock_quantity: number;
    category: string | null;
    brand: string | null;
    description: string | null;
    image_url: string | null;
    images_json: string;
  };
  options: ProductOption[];
  variants: ProductVariant[];
};
type ProductReview = {
  id: string;
  customer_name: string;
  rating: number;
  title: string | null;
  comment: string;
  created_at: string;
};
type ProductReviewsData = {
  reviews: ProductReview[];
  averageRating: number;
  reviewCount: number;
  eligibleOrders: { id: string; order_number: string | null }[];
};

function parseStringArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function parseOptionValues(value: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    }
  } catch {
    return {};
  }
  return {};
}

function priceText(value: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);
}

export function ProductDetailPage() {
  const { productKey = "" } = useParams();
  const { addToCart, setCartOpen, user, setAuthOpen } = useStore();
  const [data, setData] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const [reviewsData, setReviewsData] = useState<ProductReviewsData>({ reviews: [], averageRating: 0, reviewCount: 0, eligibleOrders: [] });
  const [reviewOrderId, setReviewOrderId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadReviews = async (key: string) => {
    const result = await apiRequest<ProductReviewsData>(`/products/${encodeURIComponent(key)}/reviews`);
    setReviewsData(result);
    setReviewOrderId((current) => current || result.eligibleOrders[0]?.id || "");
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<ProductDetailData>(`/products/${encodeURIComponent(productKey)}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        const images = [...new Set([result.product.image_url, ...parseStringArray(result.product.images_json)]
          .filter((image): image is string => typeof image === "string" && image.length > 0))];
        setHeroImage(images[0] ?? productFallback);
        const firstVariant = result.variants[0];
        setSelectedValues(firstVariant ? parseOptionValues(firstVariant.options_json) : {});
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productKey]);

  useEffect(() => {
    void loadReviews(productKey).catch(() => setReviewsData({ reviews: [], averageRating: 0, reviewCount: 0, eligibleOrders: [] }));
  }, [productKey, user?.id]);

  async function submitProductReview(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!reviewOrderId) return;
    setSubmittingReview(true);
    setReviewError("");
    try {
      await apiRequest(`/products/${encodeURIComponent(productKey)}/reviews`, {
        method: "POST",
        body: JSON.stringify({ order_id: reviewOrderId, rating: reviewRating, title: reviewTitle, comment: reviewComment }),
      });
      setReviewTitle("");
      setReviewComment("");
      setReviewOrderId("");
      await loadReviews(productKey);
    } catch (reason) {
      setReviewError(reason instanceof Error ? reason.message : "Could not submit your review.");
    } finally { setSubmittingReview(false); }
  }

  const images = useMemo(() => {
    if (!data) return [];
    return [...new Set([data.product.image_url, ...parseStringArray(data.product.images_json), ...data.variants.map((variant) => variant.image_url)]
      .filter((image): image is string => typeof image === "string" && image.length > 0))];
  }, [data]);

  const selectedVariant = data?.variants.find((variant) => {
    const values = parseOptionValues(variant.options_json);
    return data.options.every((option) => values[option.name] === selectedValues[option.name]);
  });
  useEffect(() => {
    if (selectedVariant?.image_url) setHeroImage(selectedVariant.image_url);
  }, [selectedVariant?.image_url]);
  const availability = selectedVariant?.inventory_quantity ?? 0;
  const inStock = selectedVariant
    ? selectedVariant.track_quantity ? availability > 0 : true
    : false;
  const displayPrice = selectedVariant?.price ?? data?.product.price ?? 0;

  useEffect(() => {
    if (!data) return;
    const previousTitle = document.title;
    const previousMeta = new Map<string, { element: HTMLMetaElement | null; content: string | null }>();
    const setMeta = (selector: string, name: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!previousMeta.has(selector)) previousMeta.set(selector, { element, content: element?.content ?? null });
      if (!element) {
        element = document.createElement("meta");
        if (selector.startsWith('meta[property=')) element.setAttribute("property", name);
        else element.setAttribute("name", name);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    const primaryImage = data.product.image_url || images[0] || productFallback;
    const absoluteImage = new URL(primaryImage, window.location.origin);
    if (absoluteImage.protocol === "http:" && window.location.protocol === "https:") {
      absoluteImage.protocol = "https:";
    }
    const canonicalUrl = `${window.location.origin}/products/${encodeURIComponent(data.product.id)}`;
    const description = (data.product.description || `Shop ${data.product.title} at Elovyn.`)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
    document.title = `${data.product.title} — ELOVYN`;
    setMeta('meta[name="description"]', "description", description);
    setMeta('meta[property="og:type"]', "og:type", "product");
    setMeta('meta[property="og:site_name"]', "og:site_name", "ELOVYN");
    setMeta('meta[property="og:title"]', "og:title", `${data.product.title} (${priceText(displayPrice)})`);
    setMeta('meta[property="og:description"]', "og:description", description);
    setMeta('meta[property="og:image"]', "og:image", absoluteImage.toString());
    setMeta('meta[property="og:image:secure_url"]', "og:image:secure_url", absoluteImage.toString());
    setMeta('meta[property="og:image:width"]', "og:image:width", "1200");
    setMeta('meta[property="og:image:height"]', "og:image:height", "1200");
    setMeta('meta[property="og:url"]', "og:url", canonicalUrl);
    setMeta('meta[name="twitter:card"]', "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:image"]', "twitter:image", absoluteImage.toString());
    return () => {
      document.title = previousTitle;
      previousMeta.forEach(({ element, content }, selector) => {
        if (!element) {
          document.head.querySelector(selector)?.remove();
          return;
        }
        if (content === null) element.remove();
        else element.content = content;
      });
    };
  }, [data, displayPrice, images]);

  function selectOption(name: string, value: string) {
    setSelectedValues((current) => ({ ...current, [name]: value }));
    setQuantity(1);
  }

  function isOptionAvailable(name: string, value: string) {
    if (!data) return false;
    return data.variants.some((variant) => {
      const values = parseOptionValues(variant.options_json);
      return data.options.every((option) => (
        option.name === name ? values[option.name] === value
          : selectedValues[option.name] === undefined || values[option.name] === selectedValues[option.name]
      )) && (variant.track_quantity ? variant.inventory_quantity > 0 : true);
    });
  }

  function addSelectedProduct(openCart: boolean) {
    if (!data || !selectedVariant || !inStock) return;
    const optionSummary = Object.entries(parseOptionValues(selectedVariant.options_json))
      .map(([name, value]) => `${name}: ${value}`)
      .join(", ");
    addToCart({
      id: selectedVariant.id,
      title: optionSummary ? `${data.product.title} (${optionSummary})` : data.product.title,
      price: selectedVariant.price,
      imageUrl: selectedVariant.image_url || heroImage || productFallback,
      quantity,
    });
    if (openCart) setCartOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-neutral-950">
      <Header />
      <main className="section-shell py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
          <Link to="/" className="hover:text-neutral-950">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <span>{data?.product.category || "Shop"}</span>
          {data && <><ChevronRight className="h-4 w-4" /><span className="truncate text-neutral-900">{data.product.title}</span></>}
        </nav>
        {loading && <div className="grid min-h-96 place-items-center text-sm text-neutral-500">Loading product…</div>}
        {!loading && error && (
          <section className="rounded-3xl border border-neutral-200 bg-white p-8 text-center">
            <h1 className="text-2xl font-bold">Product unavailable</h1>
            <p className="mt-2 text-sm text-neutral-600">{error}</p>
            <Link to="/" className="btn-primary mt-6 inline-flex">Back to the store</Link>
          </section>
        )}
        {!loading && data && (
          <>
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)_minmax(270px,0.68fr)] lg:gap-7">
            <div className={images.length > 1 ? "grid items-start gap-3 sm:grid-cols-[72px_minmax(0,1fr)]" : "block"}>
              {images.length > 1 && (
                <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:max-h-[740px] sm:flex-col sm:overflow-y-auto">
                  {images.map((image, index) => (
                    <button key={image} type="button" onMouseEnter={() => setHeroImage(image)} onClick={() => setHeroImage(image)}
                      aria-label={`Show product image ${index + 1}`} aria-pressed={heroImage === image}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white sm:h-[72px] sm:w-[72px] ${heroImage === image ? "border-neutral-950" : "border-transparent"}`}>
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className={`${images.length > 1 ? "order-1 sm:order-2" : ""} flex aspect-[4/5] min-h-[420px] w-full max-h-[740px] items-center justify-center overflow-hidden rounded-3xl bg-white`}>
                <img src={heroImage || data.product.image_url || productFallback} alt={data.product.title} className="h-full w-full object-contain p-2" />
              </div>
            </div>

            <div className="py-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{data.product.brand || data.product.category || "Elovyn"}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">{data.product.title}</h1>
              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-semibold">{priceText(displayPrice)}</span>
                {selectedVariant?.compare_at_price && selectedVariant.compare_at_price > displayPrice
                  ? <span className="text-base text-neutral-500 line-through">{priceText(selectedVariant.compare_at_price)}</span>
                  : data.product.compare_at_price && data.product.compare_at_price > displayPrice
                    ? <span className="text-base text-neutral-500 line-through">{priceText(data.product.compare_at_price)}</span>
                    : null}
              </div>
              <p className="mt-1 text-xs text-neutral-500">Prices shown in ZAR (R). VAT details are confirmed at checkout.</p>

              <div className="mt-6 space-y-5">
                {data.options.map((option) => {
                  const values = parseStringArray(option.values_json);
                  return (
                    <fieldset key={option.id}>
                      <legend className="mb-2 text-sm font-semibold">{option.name}: <span className="font-normal text-neutral-600">{selectedValues[option.name]}</span></legend>
                      <div className="flex flex-wrap gap-2">
                        {values.map((value) => (
                          <button key={value} type="button" onClick={() => selectOption(option.name, value)}
                            aria-pressed={selectedValues[option.name] === value} disabled={!isOptionAvailable(option.name, value)}
                            className={`min-w-12 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selectedValues[option.name] === value ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 bg-white hover:border-neutral-900"}`}>
                            {value}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}
              </div>

              <div className="mt-6 border-y border-neutral-200 py-4">
                <p className={`flex items-center gap-2 text-sm font-semibold ${inStock ? "text-emerald-700" : "text-red-700"}`}>
                  {inStock ? <Check className="h-4 w-4" /> : null}
                  {inStock ? (availability <= 5 ? `Only ${availability} left in stock` : "In stock") : "Currently unavailable"}
                </p>
                {selectedVariant && <p className="mt-1 text-xs text-neutral-500">SKU: {selectedVariant.sku}</p>}
              </div>
              {data.product.description && (
                <ul className="mt-5 space-y-2 text-sm leading-6 text-neutral-700">
                  {data.product.description.split(/\n|•/).map((feature) => feature.trim()).filter(Boolean).map((feature, index) => (
                    <li key={`${index}-${feature}`} className="flex gap-2"><span className="text-neutral-400">•</span><span>{feature}</span></li>
                  ))}
                </ul>
              )}
            </div>

            <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xl font-semibold">{priceText(displayPrice)}</p>
              <p className="mt-2 text-sm text-neutral-600">VAT details are confirmed at checkout.</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <label htmlFor="product-quantity" className="text-sm font-medium">Quantity</label>
                <select id="product-quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}
                  disabled={!inStock} className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm">
                  {Array.from({ length: Math.max(1, selectedVariant?.track_quantity ? Math.min(10, availability) : 10) }, (_, index) => index + 1)
                    .map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <button type="button" disabled={!inStock} onClick={() => addSelectedProduct(false)}
                className="mt-5 w-full rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">Add to Basket</button>
              <button type="button" disabled={!inStock} onClick={() => addSelectedProduct(true)}
                className="mt-3 w-full rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">Buy Now</button>
              <div className="mt-5 flex gap-3 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
                <Truck className="h-5 w-5 shrink-0" />
                <p>Delivery availability and fees are confirmed once your delivery address is available.</p>
              </div>
            </aside>
          </section>
          <section className="mt-14 border-t border-neutral-200 pt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="eyebrow">Customer reviews</p><h2 className="mt-2 text-2xl font-bold">Reviews for {data.product.title}</h2></div>
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <span className="flex text-amber-500">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.round(reviewsData.averageRating) ? "fill-current" : ""}`} />)}</span>
                <span>{reviewsData.reviewCount ? `${reviewsData.averageRating.toFixed(1)} · ${reviewsData.reviewCount} review${reviewsData.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}</span>
              </div>
            </div>
            {reviewsData.eligibleOrders.length > 0 ? <form onSubmit={(event) => void submitProductReview(event)} className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
              <h3 className="font-semibold">Share your experience as a verified buyer</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">Purchased in order
                  <select required value={reviewOrderId} onChange={(event) => setReviewOrderId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">
                    {reviewsData.eligibleOrders.map((order) => <option key={order.id} value={order.id}>{order.order_number || order.id}</option>)}
                  </select>
                </label>
                <div><span className="text-sm font-medium">Your rating</span><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setReviewRating(value)} aria-label={`${value} stars`} aria-pressed={reviewRating === value} className="p-1 text-amber-500"><Star className={`h-5 w-5 ${value <= reviewRating ? "fill-current" : ""}`} /></button>)}</div></div>
              </div>
              <label className="mt-4 block text-sm font-medium">Headline (optional)<input maxLength={120} value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
              <label className="mt-4 block text-sm font-medium">Review<textarea required maxLength={2000} rows={4} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3 py-2" /></label>
              {reviewError && <p role="alert" className="mt-3 text-sm text-red-700">{reviewError}</p>}
              <button type="submit" disabled={submittingReview || !reviewComment.trim()} className="btn-primary mt-4 disabled:opacity-50">{submittingReview ? "Submitting…" : "Submit review"}</button>
            </form> : !user ? <p className="mt-5 text-sm text-neutral-600">Sign in after purchasing to leave a verified-buyer review.</p> : null}
            <div className="mt-6 space-y-4">
              {reviewsData.reviews.map((review) => <article key={review.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{review.title || "Customer review"}</p><p className="mt-1 text-xs text-neutral-500">{review.customer_name} <span className="ml-2 rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">Verified Buyer</span></p></div><div className="flex text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : ""}`} />)}</div></div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{review.comment}</p>
              </article>)}
              {reviewsData.reviewCount === 0 && <p className="rounded-2xl bg-white p-5 text-sm text-neutral-500">Be the first to review this product.</p>}
            </div>
          </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
