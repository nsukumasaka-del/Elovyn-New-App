import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { findCategory, productMatchesCategory } from "@/lib/categories";
import { useStore } from "@/lib/store";
import fallbackImage from "@/assets/CLOTHING.jpg";

type SortOrder = "featured" | "newest" | "price-low" | "price-high" | "name";

export function CategoryPage() {
  const { slug } = useParams();
  const category = findCategory(slug);
  const { products, addToCart, ready } = useStore();
  const [sort, setSort] = useState<SortOrder>("featured");
  const [availability, setAvailability] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [query, setQuery] = useState("");

  const visibleProducts = useMemo(() => {
    if (!category) return [];
    const normalizedQuery = query.trim().toLowerCase();
    const result = products.filter((product) => productMatchesCategory(category.slug, product.category))
      .filter((product) => availability === "all" || (availability === "in-stock" ? product.stock_quantity > 0 : product.stock_quantity <= 0))
      .filter((product) => !normalizedQuery || product.title.toLowerCase().includes(normalizedQuery));
    return [...result].sort((left, right) => {
      if (sort === "price-low") return Number(left.price) - Number(right.price);
      if (sort === "price-high") return Number(right.price) - Number(left.price);
      if (sort === "name") return left.title.localeCompare(right.title);
      return 0;
    });
  }, [availability, category, products, query, sort]);

  if (!category) return <Navigate to="/404" replace />;

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-neutral-950">
      <Header />
      <main>
        <section className="border-b border-neutral-200 bg-white"><div className="section-shell py-12 sm:py-16"><nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.18em] text-neutral-500"><Link to="/" className="hover:text-black">Home</Link><span className="mx-2">/</span>{category.name}</nav><h1 className="mt-5 text-4xl font-black tracking-[-0.06em] sm:text-6xl">{category.name}</h1><p className="mt-4 max-w-2xl text-neutral-600">{category.description}</p></div></section>
        <section className="section-shell py-10 sm:py-14">
          <div className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${category.name}`} className="mt-2 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm font-normal normal-case tracking-normal" /></label>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Availability<select value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)} className="mt-2 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm font-normal normal-case tracking-normal"><option value="all">All products</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option></select></label>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Sort by<select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="mt-2 h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm font-normal normal-case tracking-normal"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label>
          </div>
          <p className="mt-6 text-sm text-neutral-600">{visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"}</p>
          {!ready ? <div className="py-20 text-center text-neutral-500">Loading collection…</div> : visibleProducts.length === 0 ? <div className="mt-6 rounded-3xl border border-neutral-200 bg-white px-6 py-20 text-center"><h2 className="text-2xl font-bold">No products found.</h2><p className="mt-2 text-neutral-500">Try changing the filters or check back after the next drop.</p></div> : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleProducts.map((product) => <article key={product.id} className="product-card overflow-hidden"><Link to={`/products/${product.id}`} className="block overflow-hidden"><img src={product.image_url || fallbackImage} alt={product.title} className="aspect-[4/5] w-full object-cover transition-transform duration-500 hover:scale-105" /></Link><div className="space-y-3 p-5"><p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{product.category || category.name}</p><h2 className="text-lg font-semibold"><Link to={`/products/${product.id}`} className="hover:underline">{product.title}</Link></h2><div className="flex items-center justify-between"><span className="font-semibold">R {Number(product.price).toFixed(2)}</span><span className="text-xs text-neutral-500">{product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Sold out"}</span></div><button type="button" disabled={product.stock_quantity <= 0} onClick={() => addToCart({ id: product.id, title: product.title, price: Number(product.price), imageUrl: product.image_url || fallbackImage })} className="btn-secondary w-full disabled:opacity-50">Add to bag</button></div></article>)}</div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
