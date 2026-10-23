import { motion, useInView } from "framer-motion";
import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import clothingFallback from "../assets/CLOTHING.jpg";
import { useStore } from "@/lib/store";

export const HairproductsShowcase = () => {
  const { products, addToCart, wishlist, toggleWishlist } = useStore();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const featuredProducts = useMemo(() => products.filter((product) => product.stock_quantity > 0).slice(4, 8), [products]);
  if (!featuredProducts.length) return null;

  return <section id="sale" className="bg-white py-16 sm:py-20 lg:py-24"><div className="section-shell">
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">More to explore</p><h2 className="section-heading mt-3">FEATURED PICKS</h2></div><p className="section-copy max-w-xl">More listed products from the latest Elovyn collection.</p></motion.div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{featuredProducts.map((product, index) => {
      const imageUrl = product.image_url || clothingFallback;
      return <motion.article key={product.id} id={`product-${product.id}`} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.45, delay: index * 0.08 }} className="product-card group">
        <div className="relative aspect-[4/5] overflow-hidden"><Link to={`/products/${product.id}`} aria-label={`View ${product.title}`} className="block h-full w-full"><img src={imageUrl} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></Link><span className="absolute left-4 top-4 rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">Featured</span></div>
        <div className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{product.category || "Elovyn"}</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.05em] text-neutral-950"><Link to={`/products/${product.id}`} className="hover:underline">{product.title}</Link></h3></div><button aria-label={`Save ${product.title}`} aria-pressed={wishlist.includes(product.id)} onClick={() => toggleWishlist(product.id, { id: product.id, title: product.title, price: Number(product.price), imageUrl })} className="rounded-full border border-neutral-200 p-2 text-neutral-700 transition-colors hover:border-neutral-900" type="button">{wishlist.includes(product.id) ? "♥" : "♡"}</button></div><div className="flex items-center justify-between text-sm text-neutral-600"><span>{product.stock_quantity} in stock</span><span className="text-base font-semibold text-neutral-950">R {Number(product.price).toFixed(2)}</span></div><button type="button" onClick={() => addToCart({ id: product.id, title: product.title, price: Number(product.price), imageUrl })} className="btn-secondary w-full py-2.5">Add to bag</button></div>
      </motion.article>;
    })}</div>
  </div></section>;
};
