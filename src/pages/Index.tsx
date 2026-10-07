import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HairproductsShowcase } from "@/components/BikeShowcase";
import { PressMarquee } from "@/components/PressMarquee";
import { Technology } from "@/components/Technology";
import { ClothingShowcase } from "@/components/ClothingShowcase";
import { AccessoriesShowcase } from "@/components/AccessoriesShowcase";
import { Community } from "@/components/Community";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <PressMarquee />
      <ClothingShowcase />
      <HairproductsShowcase />
      <AccessoriesShowcase />
      <Technology />
      <Community />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
