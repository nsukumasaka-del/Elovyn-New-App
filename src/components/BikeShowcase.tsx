import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import weaveImage from "../assets/WEAVE 1.jpg";
import shampooImage from "../assets/Shampoo 1.jpg";
import handBagImage from "../assets/HAND BAG COMBO.jpg";
import { useStore } from "@/lib/store";

const bestSellers = [
  {
    id: 1,
    name: "Raw Luxe Bundle",
    category: "Wigs",
    price: "R 1,969.00",
    image: weaveImage,
    tone: "Natural black",
  },
  {
    id: 2,
    name: "Hydration Set",
    category: "Care",
    price: "R 339.00",
    image: shampooImage,
    tone: "Soft amber",
  },
  {
    id: 3,
    name: "Styling Kit",
    category: "Accessories",
    price: "R 1,923.00",
    image: handBagImage,
    tone: "Minimal neutral",
  },
  {
    id: 4,
    name: "Signature Layer",
    category: "Best Seller",
    price: "R 899.00",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    tone: "Stone",
  },
];

export const HairproductsShowcase = () => {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="sale" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="section-shell">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="eyebrow">Best sellers</p>
            <h2 className="section-heading mt-3">BEST SELLERS</h2>
          </div>
          <p className="section-copy max-w-xl">The pieces customers come back for — elevated essentials with instant styling power.</p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {bestSellers.map((item, index) => (
            <motion.article
              key={item.id}
              id={`product-${["raw-luxe-bundle", "hydration-set", "styling-kit", "signature-layer"][item.id - 1]}`}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="product-card group"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute left-4 top-4 rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">Best</span>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{item.category}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.05em] text-neutral-950">{item.name}</h3>
                  </div>
                  <button aria-label={`Save ${item.name}`} aria-pressed={wishlist.includes(["raw-luxe-bundle", "hydration-set", "styling-kit", "signature-layer"][item.id - 1])} onClick={() => toggleWishlist(
                    ["raw-luxe-bundle", "hydration-set", "styling-kit", "signature-layer"][item.id - 1],
                    { id: ["raw-luxe-bundle", "hydration-set", "styling-kit", "signature-layer"][item.id - 1], title: item.name, price: Number(item.price.replace(/[^\d.]/g, "")), imageUrl: item.image },
                  )} className="rounded-full border border-neutral-200 p-2 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900" type="button">
                    {wishlist.includes(["raw-luxe-bundle", "hydration-set", "styling-kit", "signature-layer"][item.id - 1]) ? "♥" : "♡"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm text-neutral-600">
                  <span>{item.tone}</span>
                  <span className="text-base font-semibold text-neutral-950">{item.price}</span>
                </div>
                <button type="button" onClick={() => addToCart({
                  id: ["raw-luxe-bundle", "hydration-set", "styling-kit", "signature-layer"][item.id - 1],
                  title: item.name,
                  price: Number(item.price.replace(/[^\d.]/g, "")),
                  imageUrl: item.image,
                })} className="btn-secondary w-full py-2.5">Add to bag</button>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
