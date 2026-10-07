import { motion } from "framer-motion";
import heroImage from "@/assets/Front Page.png";

export const Hero = () => {
  return (
    <section className="relative isolate overflow-hidden bg-neutral-950">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Editorial fashion storefront hero"
          className="h-full w-full object-cover object-center opacity-70 grayscale-[0.08]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-black/10" />
      </div>

      <div className="section-shell relative z-10 flex min-h-[660px] items-end pb-12 pt-20 sm:pb-14 lg:min-h-[760px]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-xl"
        >
          <p className="eyebrow mb-5 text-white/70">New collection</p>
          <h1 className="max-w-lg text-5xl font-black tracking-[-0.07em] text-white sm:text-6xl lg:text-8xl">
            Own your look.
          </h1>
          <p className="mt-5 max-w-md text-base text-white/75 sm:text-lg">
            Streetwear made to stand out. Clean silhouettes, premium essentials, and effortless everyday pieces.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#new-arrivals" className="btn-primary bg-white text-neutral-950 hover:bg-neutral-200">
              Shop new arrivals
            </a>
            <a href="#streetwear" className="btn-secondary border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Shop streetwear
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
