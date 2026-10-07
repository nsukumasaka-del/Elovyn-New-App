import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import clothingImage1 from "../assets/CLOTHING.jpg";
import shirtImage from "../assets/Shirt 1.jpg";
import shirt2Image from "../assets/Shirt 2.jpg";
import twoPieceImage from "../assets/Two Piece.jpg";

const clothes = [
  {
    id: 1,
    name: "Essential Box Tee",
    category: "Streetwear",
    price: "R 529.00",
    image: shirtImage,
    accent: "Light stone",
  },
  {
    id: 2,
    name: "Everyday Overshirt",
    category: "T-Shirts",
    price: "R 699.00",
    image: shirt2Image,
    accent: "Soft navy",
  },
  {
    id: 3,
    name: "Layered Set",
    category: "New In",
    price: "R 1,249.00",
    image: twoPieceImage,
    accent: "Cream",
  },
  {
    id: 4,
    name: "Signature Hoodie",
    category: "Hoodies",
    price: "R 899.00",
    image: clothingImage1,
    accent: "Charcoal",
  },
];

export const ClothingShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="new-arrivals" className="bg-[#f6f1ea] py-16 sm:py-20 lg:py-24">
      <div className="section-shell">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="eyebrow">New arrivals</p>
            <h2 className="section-heading mt-3">NEW ARRIVALS</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            {['All', 'Streetwear', 'T-Shirts', 'Hoodies', 'Accessories', 'Wigs'].map((tab) => (
              <button key={tab} className="rounded-full border border-neutral-300 bg-white px-3 py-2 transition-colors hover:border-neutral-900 hover:text-neutral-900">
                {tab}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {clothes.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="product-card group"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-900">New</span>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{item.category}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.05em] text-neutral-950">{item.name}</h3>
                  </div>
                  <button aria-label={`Save ${item.name}`} className="rounded-full border border-neutral-200 p-2 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900">
                    ♡
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm text-neutral-600">
                  <span>{item.accent}</span>
                  <span className="text-base font-semibold text-neutral-950">{item.price}</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
