import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { defaultSiteSettings } from "@/lib/site-settings";
import { categoryPath } from "@/lib/categories";

const customerCareLinks = [
  { label: "Contact us", to: "/contact" },
  { label: "Frequently asked questions", to: "/faq" },
  { label: "Shipping & delivery", to: "/shipping-policy" },
  { label: "Returns & refunds", to: "/returns-policy" },
  { label: "Track my order", to: "/orders/track" },
  { label: "Size guide", to: "/faq#sizing" },
];

const legalLinks = [
  { label: "Terms & conditions", to: "/terms" },
  { label: "POPIA privacy policy", to: "/privacy-policy" },
];

const footerLinkClass = "text-sm text-white/70 transition-colors hover:text-white";

export const Footer = () => {
  const { siteSettings, storefrontCategories } = useStore();
  const categories = storefrontCategories.filter((category) => category.active);

  return (
    <footer className="bg-neutral-950 pt-16 text-white">
      <div className="section-shell">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr_1fr_1fr]">
          <div>
            <img src={siteSettings.logo_url || defaultSiteSettings.logo_url} alt="Elovyn logo" className="rounded-xl object-cover" style={{ width: siteSettings.logo_size, height: siteSettings.logo_size, objectPosition: `${siteSettings.logo_position_x}% ${siteSettings.logo_position_y}%` }} />
            <p className="mt-5 max-w-xs text-sm text-white/60">
              Premium streetwear and lifestyle essentials designed for effortless everyday wear.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Shop</h3>
            <ul className="mt-5 space-y-3">
              {categories.map((category) => <li key={category.id}><Link to={categoryPath(category.slug)} className={footerLinkClass}>{category.name}</Link></li>)}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Customer care</h3>
            <ul className="mt-5 space-y-3">
              {customerCareLinks.map((item) => <li key={item.to}><Link to={item.to} className={footerLinkClass}>{item.label}</Link></li>)}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Legal & privacy</h3>
            <ul className="mt-5 space-y-3">
              {legalLinks.map((item) => <li key={item.to}><Link to={item.to} className={footerLinkClass}>{item.label}</Link></li>)}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Follow</h3>
            <ul className="mt-5 space-y-3">
              {["Instagram", "TikTok", "Facebook"].map((item) => <li key={item}><a href="#" className={footerLinkClass}>{item}</a></li>)}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 py-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Elovyn. All rights reserved.</p>
          <div className="flex flex-wrap gap-6">
            <Link to="/privacy-policy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/shipping-policy" className="hover:text-white">Shipping</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
