export const categories = [
  { slug: "new-arrivals", name: "New Arrivals", description: "The latest pieces added to the Elovyn catalog." },
  { slug: "streetwear", name: "Streetwear", description: "Elevated everyday staples for an effortless rotation." },
  { slug: "t-shirts", name: "T-Shirts", description: "Clean, versatile tees built for daily wear." },
  { slug: "hoodies", name: "Hoodies", description: "Premium layers with relaxed, modern fits." },
  { slug: "accessories", name: "Accessories", description: "Finishing touches that bring the whole look together." },
  { slug: "wigs", name: "Wigs", description: "Polished textures and styling for every look." },
  { slug: "care", name: "Care", description: "Everyday essentials for keeping your style fresh." },
  { slug: "best-sellers", name: "Best Seller", description: "The pieces customers return to again and again." },
] as const;

export function categoryPath(slug: string) {
  return `/categories/${slug}`;
}

export function findCategory(slug: string | undefined) {
  return categories.find((category) => category.slug === slug);
}

export function productMatchesCategory(categorySlug: string, productCategory: string | null) {
  if (categorySlug === "new-arrivals") return true;
  if (!productCategory) return false;
  const normalized = productCategory.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (categorySlug === "best-sellers") return normalized === "best-seller" || normalized === "best-sellers";
  return normalized === categorySlug;
}
