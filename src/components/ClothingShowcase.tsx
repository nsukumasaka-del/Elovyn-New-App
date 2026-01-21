import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import clothingImage1 from "../assets/CLOTHING.jpg";
import shirtImage from "../assets/Shirt 1.jpg";
import shirt2Image from "../assets/Shirt 2.jpg";
import twoPieceImage from "../assets/Two Piece.jpg";

const clothes = [
  {
    id: 1,
    name: "Premium Shirt",
    tagline: "Comfort & Style",
    description: "High‑quality cotton‑blend men's T‑shirt with a sleek athletic fit.",
    price: "ZAR443.21",
    image: shirtImage,
    color: "Navy",
    purchaseLink: "https://amzn.to/4sMHRqW",
  },
  {
    id: 2,
    name: "Premium Shirt 2",
    tagline: "COMFORT & STYLE",
    description: "Men's Muscle Fit Textured Polo Shirt – Casual & Stylish.",
    price: "ZAR427.42",
    image: shirt2Image,
    color: "Blue",
    purchaseLink: "https://amzn.to/4pOb8ii",
  },
  {
    id: 3,
    name: "Summer Dress",
    tagline: "Light & Breezy",
    description: "Men's Vintage Print Hoodie Jogging Suit – Casual & Sporty",
    price: "ZAR418.59 (Original: ZAR837.21, 50% off)",
    image: twoPieceImage,
    color: "White",
    purchaseLink: "https://s.click.aliexpress.com/e/_c4SAW5hN",
  },
  {
    id: 4,
    name: "Casual Hoodie",
    tagline: "Cozy Essential",
    description: "Soft and comfortable hoodie ideal for layering. Premium fabric with modern design.",
    price: "ZAR549.99",
    image: clothingImage1,
    color: "Grey",
    purchaseLink: "#",
  },
];

const ClothingCard = ({ item, index }: { item: typeof clothes[0]; index: number }) => {
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
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="absolute inset-0 bg-background/40 backdrop-blur-sm rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10">
          <p className="text-xs font-medium text-accent uppercase tracking-wider mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {item.tagline}
          </p>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {item.name}
          </h3>
          <p className="text-sm text-foreground/60 mb-4 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {item.description}
          </p>
          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-sm font-medium text-foreground/80">{item.price}</span>
            <motion.a
              href={item.purchaseLink || "#"}
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

export const ClothingShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="clothing" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Premium Clothing Collection
          </h2>
          <p className="text-lg text-foreground/60 max-w-xl mx-auto">
            Discover our curated selection of premium clothing for every style.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {clothes.map((item, index) => (
            <ClothingCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
