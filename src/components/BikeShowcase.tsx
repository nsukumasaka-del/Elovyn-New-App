import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import weaveImage from "../assets/WEAVE 1.jpg";
import shampooImage from "../assets/Shampoo 1.jpg";
import handBagImage from "../assets/HAND BAG COMBO.jpg";

const bikes = [
  {
    id: 1,
    name: "Bundles",
    tagline: "Luxury Weave",
    description: "16A Raw Brazilian Virgin Human Hair Bundles, Body Wave (18–24”)",
    price: "ZAR1,969.05",
    image: weaveImage,
    color: "Sand",
    purchaseLink: "https://amzn.to/4jGX4pm",
  },
  {
    id: 2,
    name: "Shampoo",
    tagline: "Hydration Boost",
    description: "Moisture Renewal Shampoo & Conditioner Set.",
    price: "ZAR339.69",
    image: shampooImage,
    color: "Black",
    purchaseLink: "https://amzn.to/4sKmpmB",
  },
  {
    id: 3,
    name: "5‑in‑1 Hair Styling Tool",
    tagline: "Beyond boundaries",
    description: "MESCOMB 5‑in‑1 Hot Air Styler for drying, curling, and smooth styling.",
    price: "ZAR1,923.48",
    image: handBagImage,
    color: "White",
    purchaseLink: "https://amzn.to/3NqTzYg",
  },
  {
    id: 4,
    name: "Cross ST",
    tagline: "Versatile adventure",
    description: "Step-through design meets off-road capability.",
    price: "From €3,490",
    image: "https://cdn.shopify.com/s/files/1/1772/1703/files/index.cross-st.gallery.1.png?v=1764864096",
    color: "Khaki",
  },
];

const BikeCard = ({ bike, index }: { bike: typeof bikes[0]; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.15 }}
      className="group relative bg-card rounded-3xl overflow-hidden cursor-pointer"
    >
      <div className="aspect-[4/5] relative overflow-hidden">
        <img
          src={bike.image}
          alt={bike.name}
          className={`w-full h-full transition-transform duration-700 group-hover:scale-105 ${
            bike.id === 3 ? "object-contain" : "object-cover"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="absolute inset-0 bg-background/40 backdrop-blur-sm rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <p className="text-xs font-medium text-accent uppercase tracking-wider mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {bike.tagline}
          </p>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {bike.name}
          </h3>
          <p className="text-sm text-foreground/60 mb-4 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {bike.description}
          </p>
          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-sm font-medium text-foreground/80">{bike.price}</span>
            <motion.a
              href={bike.purchaseLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-hero text-xs"
            >
              View
            </motion.a>
          </div>
        </div>

      </div>
        
    </motion.div>
  );
};

export const HairproductsShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="bikes" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            ENHANCE YOUR LOOK
          </h2>
          <p className="text-lg text-foreground/60 max-w-xl mx-auto">
            Unmatched Hair. Unstoppable Confidence.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {bikes.map((bike, index) => (
            <BikeCard key={bike.id} bike={bike} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
