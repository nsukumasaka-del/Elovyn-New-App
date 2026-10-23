import { motion } from "framer-motion";
import heroImage from "@/assets/Front Page.png";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";

export const Hero = () => {
  const { siteSettings } = useStore();
  return (
    <section className="relative isolate overflow-hidden bg-neutral-950">
      <div className="absolute inset-0">
        <img
          src={siteSettings.hero_image_url || heroImage}
          alt="Editorial fashion storefront hero"
          className="h-full w-full object-cover opacity-70 grayscale-[0.08] transition-[transform,object-position] duration-500"
          style={{ objectPosition: `${siteSettings.hero_image_position_x}% ${siteSettings.hero_image_position_y}%`, transform: `scale(${siteSettings.hero_image_scale / 100})` }}
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
            {siteSettings.hero_title}
          </h1>
          <p className="mt-5 max-w-md text-base text-white/75 sm:text-lg">
            {siteSettings.hero_subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {siteSettings.hero_primary_cta_text && siteSettings.hero_primary_cta_url && <Link to={siteSettings.hero_primary_cta_url} className="btn-primary bg-white text-neutral-950 hover:bg-neutral-200">
              {siteSettings.hero_primary_cta_text}
            </Link>}
            {siteSettings.hero_secondary_cta_text && siteSettings.hero_secondary_cta_url && <Link to={siteSettings.hero_secondary_cta_url} className="btn-secondary border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
              {siteSettings.hero_secondary_cta_text}
            </Link>}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
