import { motion } from "framer-motion";
import heroImage from "@/assets/Front Page.png";

export const Hero = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Cowboy e-bike in urban setting"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="max-w-2xl"
        >
          <motion.h3
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight text-foreground mb-6 font-playfair italic text-shadow"
          >
            Modern Looks.
            <br />
            Timeless feel.
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-lg md:text-xl text-foreground/70 mb-8"
          >
            Find our latest products below.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <a href="#bikes" className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium bg-foreground text-background rounded-full transition-all duration-300 hover:bg-sand hover:text-background hover:scale-105">
              Shop Now
            </a>
          </motion.div>
        </motion.div>

        {/* Bottom Features Bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="absolute bottom-8 left-6 right-6"
        >
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-t border-foreground/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">★</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Award-winning design</p>
                  <p className="text-xs text-foreground/50">Assembled in Europe</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">⚡</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Natural ride feel</p>
                  <p className="text-xs text-foreground/50">AdaptivePower™ technology</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">🔒</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">On guard 24/7</p>
                  <p className="text-xs text-foreground/50">Pioneering theft detection</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
