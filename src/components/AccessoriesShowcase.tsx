import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const accessories = [
  {
    id: 1,
    name: "Premium Lock",
    tagline: "Maximum Security",
    description: "Lightweight yet durable lock with smart integration. Keeps your bike secure in any location.",
    price: "ZAR249.99",
    image: "https://cdn.shopify.com/s/files/1/1772/1703/files/index.cruiser.gallery.1.png?v=1764863819",
    color: "Black",
    purchaseLink: "#",
  },
  {
    id: 2,
    name: "Bike Lights Set",
    tagline: "Safety & Visibility",
    description: "Integrated front and rear lights with automatic brightness adjustment. USB rechargeable.",
    price: "ZAR199.99",
    image: "https://cdn.shopify.com/s/files/1/1772/1703/files/index.cruiser-st.gallery.1.png?v=1764863999",
    color: "White",
    purchaseLink: "#",
  },
  {
    id: 3,
    name: "Carrying Bag",
    tagline: "Easy Transport",
    description: "Spacious and durable carrying bag designed for comfortable transport. Weather-resistant material.",
    price: "ZAR299.99",
    image: "https://cdn.shopify.com/s/files/1/1772/1703/files/index.cross.gallery.1.png?v=1764864076",
    color: "Navy",
    purchaseLink: "#",
  },
  {
    id: 4,
    name: "Phone Holder",
    tagline: "Navigation Ready",
    description: "Secure phone mount with 360-degree rotation. Compatible with all phone sizes.",
    price: "ZAR149.99",
    image: "https://cdn.shopify.com/s/files/1/1772/1703/files/index.cross-st.gallery.1.png?v=1764864096",
    color: "Silver",
    purchaseLink: "#",
  },
];

const AccessoryCard = ({ accessory, index }: { accessory: typeof accessories[0]; index: number }) => {
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
          src={accessory.image}
          alt={accessory.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="absolute inset-0 bg-background/40 backdrop-blur-sm rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <p className="text-xs font-medium text-accent uppercase tracking-wider mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {accessory.tagline}
          </p>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {accessory.name}
          </h3>
          <p className="text-sm text-foreground/60 mb-4 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {accessory.description}
          </p>
          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-sm font-medium text-foreground/80">{accessory.price}</span>
            <motion.a
              href={accessory.purchaseLink || "#"}
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

export const AccessoriesShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Packed full of tech.
          </h2>
          <p className="text-lg text-foreground/60 max-w-xl mx-auto">
            Premium accessories to enhance your ride and experience.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {accessories.map((accessory, index) => (
            <AccessoryCard key={accessory.id} accessory={accessory} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
