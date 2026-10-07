import elovynLogo from "../assets/ELOVYN THE FINAL.png";

const footerGroups = {
  Shop: ["New Arrivals", "Streetwear", "T-Shirts", "Hoodies", "Accessories", "Wigs", "Sale"],
  Help: ["Contact", "Shipping", "Returns", "FAQ", "Size Guide"],
  About: ["Our Story", "Community", "Terms", "Privacy"],
  Follow: ["Instagram", "TikTok", "Facebook"],
};

export const Footer = () => {
  return (
    <footer className="bg-neutral-950 pt-16 text-white">
      <div className="section-shell">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <img src={elovynLogo} alt="Elovyn logo" className="h-16 w-auto" />
            <p className="mt-5 max-w-xs text-sm text-white/60">
              Premium streetwear and lifestyle essentials designed for effortless everyday wear.
            </p>
          </div>

          {Object.entries(footerGroups).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">{title}</h3>
              <ul className="mt-5 space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/70 transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 py-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Elovyn. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Shipping</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
