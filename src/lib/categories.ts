export type StorefrontCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  active: boolean;
};

export const defaultCategories: StorefrontCategory[] = [
  { id: "new-arrivals", slug: "new-arrivals", name: "New Arrivals", description: "The latest pieces added to the Elovyn catalog.", active: true },
  { id: "streetwear", slug: "streetwear", name: "Streetwear", description: "Elevated everyday staples for an effortless rotation.", active: true },
  { id: "t-shirts", slug: "t-shirts", name: "T-Shirts", description: "Clean, versatile tees built for daily wear.", active: true },
  { id: "hoodies", slug: "hoodies", name: "Hoodies", description: "Premium layers with relaxed, modern fits.", active: true },
  { id: "accessories", slug: "accessories", name: "Accessories", description: "Finishing touches that bring the whole look together.", active: true },
  { id: "wigs", slug: "wigs", name: "Wigs", description: "Polished textures and styling for every look.", active: true },
  { id: "care", slug: "care", name: "Care", description: "Everyday essentials for keeping your style fresh.", active: true },
  { id: "best-sellers", slug: "best-sellers", name: "Best Seller", description: "The pieces customers return to again and again.", active: true },
];

export function categoryPath(slug: string) {
  return `/categories/${slug}`;
}

export function findCategory(slug: string | undefined, categoryList: StorefrontCategory[] = defaultCategories) {
  return categoryList.find((category) => category.slug === slug);
}

export function productMatchesCategory(categorySlug: string, productCategory: string | null, categoryName?: string) {
  if (categorySlug === "new-arrivals") return true;
  if (!productCategory) return false;
  const normalizedCategories = productCategory.split(/[/>|]/).map((part) =>
    part.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  );
  if (categorySlug === "best-sellers") return normalizedCategories.some((category) => category === "best-seller" || category === "best-sellers");
  const normalizedName = categoryName?.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return normalizedCategories.includes(categorySlug) || (!!normalizedName && normalizedCategories.includes(normalizedName));
}
