import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCardImage } from "@/components/ProductCardImage";
import { findCategory, productMatchesCategory } from "@/lib/categories";
import { useStore } from "@/lib/store";
import fallbackImage from "@/assets/CLOTHING.jpg";

type SortOrder = "featured" | "newest" | "price-low" | "price-high";

export function CategoryPage() {
  const { slug } = useParams();
  const { products, addToCart, ready, storefrontCategories } = useStore();
  const category = findCategory(slug, storefrontCategories);
  const [sort, setSort] = useState<SortOrder>("featured");
  const [availability, setAvailability] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [query, setQuery] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [variantValue, setVariantValue] = useState("");

  const collectionProducts = useMemo(() => category
    ? products.filter((product) => productMatchesCategory(category.slug, product.category, category.name))
    : [], [category, products]);
  const variantValues = useMemo(() => [...new Set(collectionProducts.flatMap((product) => product.variant_values ?? []))]
    .sort((left, right) => left.localeCompare(right)), [collectionProducts]);

  const visibleProducts = useMemo(() => {
    if (!category) return [];
    const normalizedQuery = query.trim().toLowerCase();
    const minimum = minimumPrice.trim() ? Number(minimumPrice) : null;
    const maximum = maximumPrice.trim() ? Number(maximumPrice) : null;
    const result = collectionProducts
      .filter((product) => availability === "all" || (availability === "in-stock" ? product.stock_quantity > 0 : product.stock_quantity <= 0))
      .filter((product) => !normalizedQuery || product.title.toLowerCase().includes(normalizedQuery))
      .filter((product) => minimum === null || Number(product.price) >= minimum)
      .filter((product) => maximum === null || Number(product.price) <= maximum)
      .filter((product) => !variantValue || product.variant_values?.includes(variantValue));
    return [...result].sort((left, right) => {
      if (sort === "newest") return Date.parse(right.updated_at) - Date.parse(left.updated_at);
      if (sort === "price-low") return Number(left.price) - Number(right.price);
      if (sort === "price-high") return Number(right.price) - Number(left.price);
      return 0;
    });
  }, [availability, category, collectionProducts, maximumPrice, minimumPrice, query, sort, variantValue]);

  if (!category) return <Navigate to="/404" replace />;

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-neutral-950">
      <Header />
      <main>
        <section className="border-b border-neutral-200 bg-white">
          <div className="section-shell py-12 sm:py-16">
            <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              <Link to="/" className="hover:text-black">Home</Link><span className="mx-2">/</span>{category.name}
            </nav>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] sm:text-6xl">{category.name}</h1>
            <p className="mt-4 max-w-2xl text-neutral-600">{category.description}</p>
          </div>
        </section>
        <section className="section-shell py-10 sm:py-14">
          <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Search
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${category.name}`} className="mt-2 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm font-normal normal-case tracking-normal" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Availability
              <select value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)} className="mt-2 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm font-normal normal-case tracking-normal">
                <option value="all">All products</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Sort by
              <select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="mt-2 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm font-normal normal-case tracking-normal">
                <option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option>
              </select>
            </label>
            <fieldset className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <legend>Price range (ZAR)</legend>
              <div className="mt-2 flex gap-2">
                <label className="sr-only" htmlFor="minimum-price">Minimum price in rand</label>
                <input id="minimum-price" type="number" min="0" step="0.01" value={minimumPrice} onChange={(event) => setMinimumPrice(event.target.value)} placeholder="Min R" className="h-11 min-w-0 w-1/2 rounded-xl border border-neutral-300 px-3 text-sm font-normal normal-case tracking-normal" />
                <label className="sr-only" htmlFor="maximum-price">Maximum price in rand</label>
                <input id="maximum-price" type="number" min="0" step="0.01" value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)} placeholder="Max R" className="h-11 min-w-0 w-1/2 rounded-xl border border-neutral-300 px-3 text-sm font-normal normal-case tracking-normal" />
              </div>
            </fieldset>
            {variantValues.length > 0 && (
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Size / variant
                <select value={variantValue} onChange={(event) => setVariantValue(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm font-normal normal-case tracking-normal">
                  <option value="">All sizes / variants</option>
                  {variantValues.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            )}
          </div>
          <p className="mt-6 text-sm text-neutral-600">{visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"}</p>
          {!ready ? <div className="py-20 text-center text-neutral-500">Loading collection…</div> : visibleProducts.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-neutral-200 bg-white px-6 py-20 text-center">
              <h2 className="text-2xl font-bold">No products found.</h2><p className="mt-2 text-neutral-500">Try changing the filters or check back after the next drop.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <article key={product.id} className="product-card group overflow-hidden">
                  <Link to={`/products/${product.id}`} aria-label={`View ${product.title}`} className="block aspect-[4/5] overflow-hidden">
                    <ProductCardImage imageUrl={product.image_url} imagesJson={product.images_json} alt={product.title} fallback={fallbackImage} />
                  </Link>
                  <div className="space-y-3 p-5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{product.category || category.name}</p>
                    <h2 className="text-lg font-semibold"><Link to={`/products/${product.id}`} className="hover:underline">{product.title}</Link></h2>
                    <div className="flex items-center justify-between"><span className="font-semibold">R {Number(product.price).toFixed(2)}</span><span className="text-xs text-neutral-500">{product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Sold out"}</span></div>
                    <button type="button" disabled={product.stock_quantity <= 0} onClick={() => addToCart({ id: product.id, title: product.title, price: Number(product.price), imageUrl: product.image_url || fallbackImage })} className="btn-secondary w-full disabled:opacity-50">Add to bag</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
