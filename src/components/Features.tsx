import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { 
  Smartphone, 
  Battery, 
  Sun, 
  Lock, 
  Bell, 
  Activity, 
  MapPin, 
  Wifi,
  Watch,
  Shield,
  Share2,
  Leaf
} from "lucide-react";

const features = [
  { icon: Battery, title: "Removable battery", description: "Charge anywhere, up to 70km range" },
  { icon: Smartphone, title: "Wireless charger", description: "Your phone powers up as you ride" },
  { icon: Sun, title: "Integrated lights", description: "Always visible, day and night" },
  { icon: Lock, title: "Auto-lock", description: "Walk away, it locks itself" },
  { icon: Bell, title: "Theft alerts", description: "Instant alerts the moment it moves" },
  { icon: Activity, title: "Crash detection", description: "Automatically alerts contacts" },
  { icon: MapPin, title: "GPS tracking", description: "Pinpoint your bike's location" },
  { icon: Wifi, title: "Over-the-air updates", description: "Your bike gets better with time" },
  { icon: Watch, title: "Watch app", description: "Control from your wrist" },
  { icon: Shield, title: "Find My Bike", description: "Designed to outsmart thieves" },
  { icon: Share2, title: "Share My Ride", description: "Friends & family can follow" },
  { icon: Leaf, title: "Eco mode", description: "Extend your range with one tap" },
];

export const Features = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 md:py-32 bg-charcoal">
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
            Every feature designed to make your ride safer, smarter, and more enjoyable.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group glass-card p-6 hover:bg-secondary/50 transition-all duration-300 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {feature.title}
              </h3>
              <p className="text-xs text-foreground/50">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
