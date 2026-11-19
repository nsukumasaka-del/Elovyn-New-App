export type EditorialBanner = {
  imageUrl: string;
  eyebrow: string;
  headline: string;
  description: string;
  buttonText: string;
  buttonLink: string;
};

export const defaultEditorialBanner: EditorialBanner = {
  imageUrl: "",
  eyebrow: "THE STREETWEAR EDIT",
  headline: "Everyday pieces. Elevated.",
  description: "Thoughtful layers, sharp silhouettes, and textures that transition from laid-back to standout in seconds.",
  buttonText: "Explore the collection",
  buttonLink: "/categories/streetwear",
};
