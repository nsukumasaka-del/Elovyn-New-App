export type DualFeatureCard = {
  id: string;
  imageUrl: string;
  eyebrow: string;
  headline: string;
  description: string;
  buttonText: string;
  categorySlug: string;
  buttonLink: string;
};

export const defaultDualFeatureCards: DualFeatureCard[] = [
  {
    id: "hoodies",
    imageUrl: "",
    eyebrow: "Hoodies",
    headline: "Essential layers for every rotation.",
    description: "Modern fits, premium weight, and all-day comfort for the pieces you reach for most.",
    buttonText: "Shop hoodies",
    categorySlug: "hoodies",
    buttonLink: "/categories/hoodies",
  },
  {
    id: "wigs",
    imageUrl: "",
    eyebrow: "Wigs",
    headline: "Complete the look.",
    description: "Polished textures and styling that finish the outfit with ease.",
    buttonText: "Shop wigs",
    categorySlug: "wigs",
    buttonLink: "/categories/wigs",
  },
];
