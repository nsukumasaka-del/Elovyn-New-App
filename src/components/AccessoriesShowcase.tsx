import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { useStore } from "@/lib/store";

const accessories = [
  {
    id: 1,
    name: "Leather Crossbody",
    category: "Bags",
    price: "R 849.00",
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
    tone: "Black",
  },
  {
    id: 2,
    name: "Structured Cap",
    category: "Hats",
    price: "R 399.00",
    image: "https://images.unsplash.com/photo-1521369909026-2afed882baee?auto=format&fit=crop&w=900&q=80",
    tone: "Stone",
  },
  {
    id: 3,
    name: "Layered Chains",
    category: "Jewellery",
    price: "R 560.00",
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80",
    tone: "Silver",
  },
  {
    id: 4,
    name: "Everyday Tote",
    category: "Accessories",
    price: "R 720.00",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    tone: "Sand",
  },
];

export const AccessoriesShowcase = () => {
  const { addToCart, wishlist, toggleWishlist } = useStore();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="accessories" className="bg-[#f3efe9] py-16 sm:py-20 lg:py-24">
      <div className="section-shell">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="eyebrow">Complete the look</p>
            <h2 className="section-heading mt-3">ACCESSORIES</h2>
          </div>
          <p className="section-copy max-w-xl">Minimal, functional finishing touches that sharpen the outfit and bring the whole look together.</p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {accessories.map((item, index) => (
            <motion.article
              key={item.id}
              id={`product-${["leather-crossbody", "structured-cap", "layered-chains", "everyday-tote"][item.id - 1]}`}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="product-card group"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{item.category}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.05em] text-neutral-950">{item.name}</h3>
                  </div>
                  <button aria-label={`Save ${item.name}`} aria-pressed={wishlist.includes(["leather-crossbody", "structured-cap", "layered-chains", "everyday-tote"][item.id - 1])} onClick={() => toggleWishlist(
                    ["leather-crossbody", "structured-cap", "layered-chains", "everyday-tote"][item.id - 1],
                    { id: ["leather-crossbody", "structured-cap", "layered-chains", "everyday-tote"][item.id - 1], title: item.name, price: Number(item.price.replace(/[^\d.]/g, "")), imageUrl: item.image },
                  )} className="rounded-full border border-neutral-200 p-2 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900" type="button">
                    {wishlist.includes(["leather-crossbody", "structured-cap", "layered-chains", "everyday-tote"][item.id - 1]) ? "♥" : "♡"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm text-neutral-600">
                  <span>{item.tone}</span>
                  <span className="text-base font-semibold text-neutral-950">{item.price}</span>
                </div>
                <button type="button" onClick={() => addToCart({
                  id: ["leather-crossbody", "structured-cap", "layered-chains", "everyday-tote"][item.id - 1],
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
