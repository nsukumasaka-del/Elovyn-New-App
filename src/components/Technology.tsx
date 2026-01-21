import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Zap, Mountain, Wind, Gauge } from "lucide-react";

const features = [
  {
    icon: Mountain,
    title: "Incline assistance",
    description: "Automatically adjusts power on hills",
  },
  {
    icon: Zap,
    title: "Instant response",
    description: "Zero-lag power delivery",
  },
  {
    icon: Gauge,
    title: "Powerful motor",
    description: "250W hub motor, 45Nm torque",
  },
  {
    icon: Wind,
    title: "Wind compensation",
    description: "Senses headwind and adapts",
  },
];

export const Technology = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="technology" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-background to-background" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">
              Clothes
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mt-4 mb-6 leading-tight">
              Premium clothing
              <br />
              <span className="text-gradient">for every style.</span>
            </h2>
            <p className="text-lg text-foreground/60 mb-8 max-w-lg">
              Discover our curated collection of premium clothing designed for comfort, style, and quality. From casual wear to activewear, find the perfect pieces for your lifestyle.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{feature.title}</h4>
                    <p className="text-xs text-foreground/50">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.a
              href="#"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-outline-hero"
            >
              Book a free test ride
            </motion.a>
          </motion.div>

          {/* Right visual */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square relative rounded-3xl overflow-hidden bg-gradient-to-br from-secondary via-charcoal to-background">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Animated rings */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 w-64 h-64 rounded-full border-2 border-accent/30"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.05, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                    className="absolute inset-0 w-64 h-64 rounded-full border border-accent/20"
                  />
                  <div className="w-64 h-64 rounded-full bg-gradient-to-br from-accent/40 to-accent/10 flex items-center justify-center">
                    <div className="text-center">
                      <Zap className="w-16 h-16 text-accent mx-auto mb-4" />
                      <span className="text-4xl font-bold text-foreground">250W</span>
                      <p className="text-sm text-foreground/60 mt-1">Smart Motor</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
