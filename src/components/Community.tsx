import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const communityImages = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
];

export const Community = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="community" className="bg-[#f3efe9] py-16 sm:py-20 lg:py-24">
      <div className="section-shell">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-10 text-left sm:text-center"
        >
          <p className="eyebrow">Wear it your way</p>
          <h2 className="section-heading mt-3 text-balance">Style that feels personal.</h2>
          <p className="section-copy mt-4 sm:mx-auto">
            A community built around confidence, individuality, and everyday essentials that move with you.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3">
          {communityImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className={`overflow-hidden rounded-[1.6rem] border border-neutral-200 bg-white ${index === 0 || index === 2 ? "md:translate-y-8" : ""}`}
            >
              <img
                src={image}
                alt={`Community style ${index + 1}`}
                className="h-[280px] w-full object-cover transition-transform duration-500 hover:scale-105 md:h-[420px]"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
