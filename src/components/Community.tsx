import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { value: "229", suffix: "M+", label: "Kilometers ridden" },
  { value: "37", suffix: "K+", label: "Active riders" },
  { value: "15", suffix: "+", label: "Countries" },
  { value: "4.8", suffix: "/5", label: "App Store rating" },
];

const communityImages = [
  "https://cdn.shopify.com/s/files/1/1772/1703/files/index-community-0.jpg?v=1764771097",
  "https://cdn.shopify.com/s/files/1/1772/1703/files/index-community-1.jpg?v=1764771097",
  "https://cdn.shopify.com/s/files/1/1772/1703/files/index-community-2.jpg?v=1764771098",
  "https://cdn.shopify.com/s/files/1/1772/1703/files/index-community-4.jpg?v=1764771097",
  "https://cdn.shopify.com/s/files/1/1772/1703/files/index-community-5.jpg?v=1764771098",
  "https://cdn.shopify.com/s/files/1/1772/1703/files/index-community-6.jpg?v=1764771098",
];

export const Community = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="community" className="py-24 md:py-32 bg-background overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            You'll never ride alone
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Together we have ridden hundreds of millions of kilometres. Every day, 
            that's one pedal closer to safer, cleaner cities.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="flex items-baseline justify-center">
                <span className="text-4xl md:text-5xl font-bold text-foreground">
                  {stat.value}
                </span>
                <span className="text-2xl md:text-3xl font-bold text-accent">
                  {stat.suffix}
                </span>
              </div>
              <p className="text-sm text-foreground/50 mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {communityImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="aspect-square rounded-2xl overflow-hidden"
            >
              <img
                src={image}
                alt={`Community rider ${index + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
