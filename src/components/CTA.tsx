import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

export const CTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-charcoal to-background">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Ready to reinvent your ride?
          </h2>
          <p className="text-lg text-foreground/60 mb-10 max-w-xl mx-auto">
            Experience the future of urban mobility. Book a free test ride today 
            and feel the difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a
              href="#"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-hero inline-flex items-center gap-2"
            >
              Book a test ride
              <ArrowRight className="w-4 h-4" />
            </motion.a>
            <motion.a
              href="#bikes"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-outline-hero"
            >
              View all bikes
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
