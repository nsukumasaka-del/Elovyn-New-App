import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ClothingShowcase } from "@/components/ClothingShowcase";
import { HairproductsShowcase } from "@/components/BikeShowcase";
import { AccessoriesShowcase } from "@/components/AccessoriesShowcase";
import { Community } from "@/components/Community";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import clothingImage from "@/assets/CLOTHING.jpg";
import hoodieImage from "@/assets/Hoodie.png";
import bagImage from "@/assets/HAND BAG COMBO.jpg";
import wigImage from "@/assets/WEAVE 1.jpg";
import shirtImage from "@/assets/Shirt 1.jpg";

const categoryTiles = [
  { title: "Streetwear", subtitle: "Shop collection", image: clothingImage, href: "#streetwear" },
  { title: "T-Shirts", subtitle: "Shop essentials", image: shirtImage, href: "#new-arrivals" },
  { title: "Hoodies", subtitle: "Layer up", image: hoodieImage, href: "#hoodies" },
  { title: "Accessories", subtitle: "Complete the look", image: bagImage, href: "#accessories" },
  { title: "Wigs", subtitle: "Elevate your style", image: wigImage, href: "#wigs" },
];

const Index = () => {
  return (
    <div id="top" className="min-h-screen bg-[#f6f1ea] text-neutral-950">
      <Header />

      <main>
        <Hero />

        <section id="streetwear" className="py-16 sm:py-20 lg:py-24">
          <div className="section-shell">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow">Shop by category</p>
                <h2 className="section-heading mt-3 text-balance">Built for everyday rotation.</h2>
              </div>
              <p className="section-copy max-w-xl">Premium staples designed to move effortlessly between city days, studio sessions, and night plans.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {categoryTiles.map((tile) => (
                <a key={tile.title} href={tile.href} className="category-card group overflow-hidden">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img
                      src={tile.image}
                      alt={tile.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/80">{tile.title}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{tile.title}</h3>
                      <span className="mt-3 inline-flex items-center text-sm font-medium text-white/90">
                        {tile.subtitle} →
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <ClothingShowcase />

        <section className="py-10 sm:py-14">
          <div className="section-shell">
            <div className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-neutral-950 text-white">
              <div className="grid items-center gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative min-h-[360px] bg-neutral-900">
                  <img src={clothingImage} alt="Editorial campaign" className="h-full w-full object-cover opacity-75" />
                </div>
                <div className="p-8 sm:p-10 lg:p-12">
                  <p className="eyebrow text-white/70">The streetwear edit</p>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.06em] sm:text-4xl lg:text-5xl">
                    Everyday pieces.<br />Elevated.
                  </h2>
                  <p className="mt-4 max-w-lg text-base text-white/70">
                    Thoughtful layers, sharp silhouettes, and textures that transition from laid-back to standout in seconds.
                  </p>
                  <a href="#new-arrivals" className="btn-primary mt-8 bg-white text-neutral-950 hover:bg-neutral-200">
                    Explore the collection
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <HairproductsShowcase />

        <section id="hoodies" className="py-16 sm:py-20">
          <div className="section-shell">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white">
                <div className="grid h-full items-end md:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative min-h-[420px]">
                    <img src={hoodieImage} alt="Hoodies collection" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-7 sm:p-8">
                    <p className="eyebrow">Hoodies</p>
                    <h3 className="mt-3 text-3xl font-black tracking-[-0.06em]">Essential layers for every rotation.</h3>
                    <p className="mt-4 text-sm text-neutral-600">Modern fits, premium weight, and all-day comfort for the pieces you reach for most.</p>
                    <a href="#new-arrivals" className="btn-secondary mt-6">Shop hoodies</a>
                  </div>
                </div>
              </div>

              <div id="wigs" className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white">
                <div className="grid h-full items-end md:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative min-h-[420px]">
                    <img src={wigImage} alt="Wigs and styling" className="h-full w-full object-cover" />
                  </div>
                  <div className="p-7 sm:p-8">
                    <p className="eyebrow">Wigs</p>
                    <h3 className="mt-3 text-3xl font-black tracking-[-0.06em]">Complete the look.</h3>
                    <p className="mt-4 text-sm text-neutral-600">Polished textures and styling that finish the outfit with ease.</p>
                    <a href="#sale" className="btn-secondary mt-6">Shop wigs</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AccessoriesShowcase />
        <Community />

        <section className="pb-16 pt-6 sm:pb-20 lg:pb-24">
          <div className="section-shell">
            <div className="rounded-[2rem] border border-neutral-200 bg-white px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">Stay in the loop</p>
                  <h2 className="mt-3 max-w-lg text-3xl font-black tracking-[-0.06em] sm:text-5xl">New drops, exclusive offers and restocks — straight to your inbox.</h2>
                </div>
                <form className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="newsletter-email">Email address</label>
                  <input
                    id="newsletter-email"
                    type="email"
                    placeholder="Email address"
                    className="h-12 flex-1 rounded-full border border-neutral-300 bg-neutral-50 px-4 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                  />
                  <button type="submit" className="btn-primary h-12">Sign me up</button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <CTA />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
