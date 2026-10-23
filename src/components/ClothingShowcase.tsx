import { motion, useInView } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import clothingFallback from "../assets/CLOTHING.jpg";
import { useStore } from "@/lib/store";

const categoryTabs = ["All", "Streetwear", "T-Shirts", "Hoodies", "Accessories", "Wigs"];

function formatPrice(value: number | string) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value));
}

export const ClothingShowcase = () => {
  const { products, ready, addToCart, wishlist, toggleWishlist } = useStore();
  const [activeCategory, setActiveCategory] = useState("All");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const visibleProducts = useMemo(() => products
    .filter((product) => activeCategory === "All" || product.category?.toLocaleLowerCase() === activeCategory.toLocaleLowerCase())
    .slice(0, 8), [activeCategory, products]);

  return (
    <section id="new-arrivals" className="bg-[#f6f1ea] py-16 sm:py-20 lg:py-24">
      <div className="section-shell">
        <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="eyebrow">New arrivals</p><h2 className="section-heading mt-3">NEW ARRIVALS</h2></div>
          <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            {categoryTabs.map((tab) => <button key={tab} type="button" aria-pressed={activeCategory === tab} onClick={() => setActiveCategory(tab)} className={`rounded-full border px-3 py-2 transition-colors ${activeCategory === tab ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 bg-white hover:border-neutral-900 hover:text-neutral-900"}`}>{tab}</button>)}
          </div>
        </motion.div>

        {!ready ? <div className="py-16 text-center text-sm text-neutral-500">Loading new arrivals…</div> : visibleProducts.length === 0 ? (
          <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-16 text-center"><h3 className="text-xl font-semibold">No products in this collection.</h3><p className="mt-2 text-sm text-neutral-500">Listed inventory will appear here automatically.</p></div>
        ) : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {visibleProducts.map((product, index) => {
            const imageUrl = product.image_url || clothingFallback;
            const inStock = product.stock_quantity > 0;
            return <motion.article key={product.id} id={`product-${product.id}`} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.45, delay: index * 0.08 }} className="product-card group">
              <div className="relative aspect-[4/5] overflow-hidden"><Link to={`/products/${product.id}`} aria-label={`View ${product.title}`} className="block h-full w-full"><img src={imageUrl} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></Link><span className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-900">New</span></div>
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{product.category || "New arrival"}</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.05em] text-neutral-950"><Link to={`/products/${product.id}`} className="hover:underline">{product.title}</Link></h3></div><button aria-label={`Save ${product.title}`} aria-pressed={wishlist.includes(product.id)} onClick={() => toggleWishlist(product.id, { id: product.id, title: product.title, price: Number(product.price), imageUrl })} className="rounded-full border border-neutral-200 p-2 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900" type="button">{wishlist.includes(product.id) ? "♥" : "♡"}</button></div>
                <div className="flex items-center justify-between gap-3 text-sm text-neutral-600"><span>{inStock ? `${product.stock_quantity} in stock` : "Sold out"}</span><span className="text-base font-semibold text-neutral-950">{formatPrice(product.price)}</span></div>
                <button type="button" disabled={!inStock} onClick={() => addToCart({ id: product.id, title: product.title, price: Number(product.price), imageUrl })} className="btn-secondary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-50">Add to bag</button>
              </div>
            </motion.article>;
          })}
        </div>}
      </div>
    </section>
  );
};
