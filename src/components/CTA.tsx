import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

export const CTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="bg-neutral-950 py-16 text-white sm:py-20 lg:py-24">
      <div className="section-shell">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="eyebrow text-white/65">Modern essentials</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.06em] sm:text-5xl">
            Ready to build your everyday uniform?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70 sm:text-lg">
            Discover effortless layers and polished accessories that carry your look from weekday comfort to after-hours edge.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <motion.a href="#new-arrivals" className="btn-primary bg-white text-neutral-950 hover:bg-neutral-200" whileHover={{ y: -1 }}>
              Shop the edit
              <ArrowRight className="ml-2 h-4 w-4" />
            </motion.a>
            <motion.a href="#streetwear" className="btn-secondary border-white/25 bg-transparent text-white hover:border-white/50 hover:bg-white/5">
              View categories
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
