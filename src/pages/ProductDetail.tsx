import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Camera, Check, ChevronRight, Star, Truck, X } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useStore } from "@/lib/store";
import { categoryPath } from "@/lib/categories";
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
    updated_at: string;
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
  images: string[];
  verified_purchase: boolean;
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

async function compressReviewPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose JPG, PNG, or WebP photos.");
  }
  if (file.size > 20 * 1024 * 1024) throw new Error("Each selected photo must be 20 MB or smaller.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This photo could not be prepared for upload.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const compressed = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("This photo could not be compressed.")), "image/webp", 0.82);
  });
  if (compressed.size > 5 * 1024 * 1024) throw new Error("A photo is still larger than 5 MB after compression.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(compressed.type)) {
    throw new Error("This browser could not compress the photo to a supported image format.");
  }
  const extension = compressed.type === "image/jpeg" ? "jpg" : compressed.type === "image/png" ? "png" : "webp";
  return new File([compressed], `${file.name.replace(/\.[^.]+$/, "")}.${extension}`, { type: compressed.type });
}

export function ProductDetailPage() {
  const { productKey = "" } = useParams();
  const { addToCart, setCartOpen, user, setAuthOpen, setAuthMode, storefrontCategories } = useStore();
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
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [activeReviewImage, setActiveReviewImage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const reviewFormRef = useRef<HTMLFormElement>(null);

  const loadReviews = async (key: string) => {
    const result = await apiRequest<ProductReviewsData>(`/products/${encodeURIComponent(key)}/reviews`);
    setReviewsData(result);
    setReviewOrderId(result.eligibleOrders[0]?.id || "");
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

  const reviewPhotoPreviews = useMemo(() => reviewPhotos.map((file) => URL.createObjectURL(file)), [reviewPhotos]);
  useEffect(() => () => reviewPhotoPreviews.forEach((url) => URL.revokeObjectURL(url)), [reviewPhotoPreviews]);

  function openReviewForm() {
    setReviewFormOpen(true);
    if (!user) {
      setAuthMode("signin");
      setAuthOpen(true);
    }
    window.setTimeout(() => reviewFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  function selectReviewPhotos(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length > 4) {
      setReviewError("Choose up to 4 photos.");
      return;
    }
    setReviewError("");
    setReviewPhotos(selected);
  }

  async function submitProductReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const needsGuestVerification = !user || reviewsData.eligibleOrders.length === 0;
    const form = event.currentTarget;
    const orderNumber = (form.elements.namedItem("order_number") as HTMLInputElement | null)?.value.trim();
    const email = (form.elements.namedItem("review_email") as HTMLInputElement | null)?.value.trim();
    if (!needsGuestVerification && !reviewOrderId) return;
    setSubmittingReview(true);
    setReviewError("");
    try {
      const body = new FormData();
      body.set("rating", String(reviewRating));
      body.set("title", reviewTitle);
      body.set("comment", reviewComment);
      if (needsGuestVerification) {
        body.set("order_number", orderNumber ?? "");
        body.set("email", email ?? "");
      } else {
        body.set("order_id", reviewOrderId);
      }
      for (const photo of reviewPhotos) body.append("images", await compressReviewPhoto(photo));
      await apiRequest(`/products/${encodeURIComponent(productKey)}/reviews`, {
        method: "POST",
        body,
      });
      setReviewTitle("");
      setReviewComment("");
      setReviewOrderId("");
      setReviewPhotos([]);
      setReviewFormOpen(false);
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
    const imageVersion = encodeURIComponent(data.product.updated_at || "1");
    const socialImage = `https://elovyn.store/api/og-image/${encodeURIComponent(data.product.id)}?v=${imageVersion}`;
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
    setMeta('meta[property="og:image"]', "og:image", socialImage);
    setMeta('meta[property="og:image:secure_url"]', "og:image:secure_url", socialImage);
    setMeta('meta[property="og:image:width"]', "og:image:width", "1200");
    setMeta('meta[property="og:image:height"]', "og:image:height", "1200");
    setMeta('meta[property="og:url"]', "og:url", canonicalUrl);
    setMeta('meta[name="twitter:card"]', "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:image"]', "twitter:image", socialImage);
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
  }, [data, displayPrice]);

  useEffect(() => {
    if (!sizeGuideOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSizeGuideOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sizeGuideOpen]);

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

  const categoryParts = (data?.product.category || "").split(/[/>|]/)
    .map((part) => part.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  const productCategoryLink = storefrontCategories.find((category) =>
    categoryParts.includes(category.slug) || categoryParts.includes(category.name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
  );
  const showSizeGuide = Boolean(data && (
    data.options.some((option) => /size/i.test(option.name))
    || /hoodie|clothing|apparel|streetwear|t-shirt|shirt/i.test(data.product.category || "")
  ));

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-neutral-950">
      <Header />
      <main className="section-shell py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
          <Link to="/" className="hover:text-neutral-950">Home</Link>
          <ChevronRight className="h-4 w-4" />
          {data?.product.category && productCategoryLink
            ? <Link to={categoryPath(productCategoryLink.slug)} className="hover:text-neutral-950">{productCategoryLink.name}</Link>
            : <span>{data?.product.category || "Shop"}</span>}
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
                      <legend className="mb-2 flex w-full items-center justify-between gap-3 text-sm font-semibold">
                        <span>{option.name}: <span className="font-normal text-neutral-600">{selectedValues[option.name]}</span></span>
                        {/size/i.test(option.name) && showSizeGuide && <button type="button" onClick={() => setSizeGuideOpen(true)} className="text-xs font-medium text-neutral-600 underline">Size Guide</button>}
                      </legend>
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
                <p>Estimated South African delivery: 7-14 business days after processing, with tracked courier delivery. Final delivery fees are shown before payment.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-neutral-600">
                <span className="rounded-full bg-neutral-100 px-3 py-1.5">Secure Yoco checkout</span>
                <span className="rounded-full bg-neutral-100 px-3 py-1.5">7-day returns on eligible items</span>
                <span className="rounded-full bg-neutral-100 px-3 py-1.5">Nationwide SA delivery</span>
              </div>
            </aside>
          </section>
          {showSizeGuide && sizeGuideOpen && (
            <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4" onMouseDown={() => setSizeGuideOpen(false)}>
              <section role="dialog" aria-modal="true" aria-labelledby="size-guide-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                  <div><p className="eyebrow">Fit reference</p><h2 id="size-guide-title" className="mt-2 text-2xl font-bold">Size guide</h2></div>
                  <button type="button" onClick={() => setSizeGuideOpen(false)} aria-label="Close size guide" className="rounded-full px-3 py-1 text-neutral-600 hover:bg-neutral-100">Close</button>
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-600">General international garment reference in centimetres. Measurements and fit vary by item; use any product-specific sizing details first.</p>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                    <thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500"><th className="py-3 pr-4">Size</th><th className="py-3 pr-4">Chest (cm)</th><th className="py-3 pr-4">Length (cm)</th><th className="py-3 pr-4">Shoulder (cm)</th><th className="py-3">Waist (cm)</th></tr></thead>
                    <tbody className="divide-y divide-neutral-100">
                      {[["XS", "84-88", "62", "38-40", "68-72"], ["S", "88-92", "64", "40-42", "72-76"], ["M", "92-100", "66", "42-44", "76-84"], ["L", "100-108", "69", "44-46", "84-92"], ["XL", "108-116", "72", "46-48", "92-100"], ["2XL", "116-124", "75", "48-50", "100-108"]].map((row) => (
                        <tr key={row[0]}><th className="py-3 pr-4 font-semibold">{row[0]}</th>{row.slice(1).map((value, index) => <td key={`${row[0]}-${index}`} className="py-3 pr-4 text-neutral-600">{value}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-5 rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">Fit advisory: measure over light clothing and compare with the product details. If you are between sizes, consider the fit you prefer and contact us if you need help.</p>
              </section>
            </div>
          )}
          <section className="mt-14 border-t border-neutral-200 pt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="eyebrow">Customer reviews</p><h2 className="mt-2 text-2xl font-bold">Reviews for {data.product.title}</h2></div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <span className="flex text-amber-500">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.round(reviewsData.averageRating) ? "fill-current" : ""}`} />)}</span>
                  <span>{reviewsData.reviewCount ? `${reviewsData.averageRating.toFixed(1)} · ${reviewsData.reviewCount} review${reviewsData.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}</span>
                </div>
                <button type="button" onClick={openReviewForm} className="btn-primary">Write a Review</button>
              </div>
            </div>
            {reviewsData.reviews.some((review) => review.images.length > 0) && <div className="mt-7">
              <h3 className="text-sm font-semibold">Customer Photos</h3>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {reviewsData.reviews.flatMap((review) => review.images.map((image, index) => (
                  <button key={`${review.id}-${index}`} type="button" onClick={() => setActiveReviewImage(image)} aria-label="View customer photo" className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200">
                    <img src={image} alt={`Customer photo ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                )))}
              </div>
            </div>}
            {reviewFormOpen && <form ref={reviewFormRef} onSubmit={(event) => void submitProductReview(event)} className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div><h3 className="font-semibold">Share your experience</h3><p className="mt-1 text-sm text-neutral-500">Reviews are verified against a completed order.</p></div>
                <button type="button" onClick={() => setReviewFormOpen(false)} aria-label="Close review form" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {!user || reviewsData.eligibleOrders.length === 0 ? <>
                  <label className="text-sm font-medium">Order number
                    <input required name="order_number" autoComplete="off" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" placeholder="Enter your order number" />
                  </label>
                  <label className="text-sm font-medium">Purchase email
                    <input required type="email" name="review_email" autoComplete="email" className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" placeholder="Email used at checkout" />
                  </label>
                </> : <label className="text-sm font-medium">Purchased in order
                  <select required value={reviewOrderId} onChange={(event) => setReviewOrderId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3">
                    {reviewsData.eligibleOrders.map((order) => <option key={order.id} value={order.id}>{order.order_number || order.id}</option>)}
                  </select>
                </label>}
                <div><span className="text-sm font-medium">Your rating</span><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setReviewRating(value)} aria-label={`${value} stars`} aria-pressed={reviewRating === value} className="p-1 text-amber-500"><Star className={`h-5 w-5 ${value <= reviewRating ? "fill-current" : ""}`} /></button>)}</div></div>
              </div>
              {!user && <button type="button" onClick={() => { setAuthMode("signin"); setAuthOpen(true); }} className="mt-3 text-sm font-medium text-neutral-700 underline">Sign in instead</button>}
              <label className="mt-4 block text-sm font-medium">Headline (optional)<input maxLength={120} value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-neutral-300 px-3" /></label>
              <label className="mt-4 block text-sm font-medium">Review<textarea required maxLength={2000} rows={4} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3 py-2" /></label>
              <div className="mt-4">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
                  <Camera className="h-4 w-4" /> Add photos (up to 4)
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { selectReviewPhotos(event.target.files); event.target.value = ""; }} />
                </label>
                {reviewPhotos.length > 0 && <div className="mt-3 flex flex-wrap gap-3">
                  {reviewPhotos.map((photo, index) => <div key={`${photo.name}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-xl border border-neutral-200">
                    <img src={reviewPhotoPreviews[index]} alt={`Selected photo ${index + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setReviewPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} aria-label={`Remove photo ${index + 1}`} className="absolute right-1 top-1 rounded-full bg-white/90 p-1"><X className="h-3 w-3" /></button>
                  </div>)}
                </div>}
              </div>
              {reviewError && <p role="alert" className="mt-3 text-sm text-red-700">{reviewError}</p>}
              <button type="submit" disabled={submittingReview || !reviewComment.trim()} className="btn-primary mt-4 disabled:opacity-50">{submittingReview ? "Submitting…" : "Submit review"}</button>
            </form>}
            <div className="mt-6 space-y-4">
              {reviewsData.reviews.map((review) => <article key={review.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{review.title || "Customer review"}</p><p className="mt-1 text-xs text-neutral-500">{review.customer_name} {review.verified_purchase && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">Verified Purchase</span>}</p></div><div className="flex text-amber-500" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : ""}`} />)}</div></div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{review.comment}</p>
                {review.images.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{review.images.map((image, index) => <button key={`${review.id}-${index}`} type="button" onClick={() => setActiveReviewImage(image)} aria-label="View customer photo" className="h-20 w-20 overflow-hidden rounded-xl border border-neutral-200"><img src={image} alt={`Review photo ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}
              </article>)}
              {reviewsData.reviewCount === 0 && <button type="button" onClick={openReviewForm} className="w-full rounded-2xl bg-white p-5 text-left text-sm text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800">Be the first to review this product.</button>}
            </div>
          </section>
          {activeReviewImage && <div className="fixed inset-0 z-[130] grid place-items-center bg-black/80 p-4" role="presentation" onMouseDown={() => setActiveReviewImage(null)}>
            <section role="dialog" aria-modal="true" aria-label="Customer photo" className="relative max-h-[90vh] max-w-5xl" onMouseDown={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setActiveReviewImage(null)} aria-label="Close customer photo" className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-2 text-neutral-800 shadow"><X className="h-5 w-5" /></button>
              <img src={activeReviewImage} alt="Customer-submitted product photo" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
            </section>
          </div>}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
