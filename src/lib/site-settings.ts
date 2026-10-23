export type SiteSettings = {
  logo_url: string;
  logo_size: number;
  logo_position_x: number;
  logo_position_y: number;
  favicon_url: string;
  hero_image_url: string;
  hero_image_scale: number;
  hero_image_position_x: number;
  hero_image_position_y: number;
  hero_title: string;
  hero_subtitle: string;
  announcement_bar_text: string;
  hero_primary_cta_text: string;
  hero_primary_cta_url: string;
  hero_secondary_cta_text: string;
  hero_secondary_cta_url: string;
  promotional_banner_title: string;
  promotional_banner_text: string;
  promotional_banner_image_url: string;
  promotional_image_scale: number;
  promotional_image_position_x: number;
  promotional_image_position_y: number;
  updated_at?: string;
};

export const defaultSiteSettings: SiteSettings = {
  logo_url: "/elovyn-logo.jpeg?v=3",
  logo_size: 48,
  logo_position_x: 50,
  logo_position_y: 50,
  favicon_url: "/elovyn-logo.jpeg?v=3",
  hero_image_url: "",
  hero_image_scale: 100,
  hero_image_position_x: 50,
  hero_image_position_y: 50,
  hero_title: "Own your look.",
  hero_subtitle: "Streetwear made to stand out. Clean silhouettes, premium essentials, and effortless everyday pieces.",
  announcement_bar_text: "FREE DELIVERY ON ORDERS OVER R1,500",
  hero_primary_cta_text: "Shop new arrivals",
  hero_primary_cta_url: "/categories/new-arrivals",
  hero_secondary_cta_text: "Shop streetwear",
  hero_secondary_cta_url: "/categories/streetwear",
  promotional_banner_title: "",
  promotional_banner_text: "",
  promotional_banner_image_url: "",
  promotional_image_scale: 100,
  promotional_image_position_x: 50,
  promotional_image_position_y: 50,
};
