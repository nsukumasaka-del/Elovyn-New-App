import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import elovynLogo from "../assets/ELOVYN THE FINAL.png";

const announcementMessages = [
  "FREE DELIVERY ON ORDERS OVER R1,500",
  "NEW STREETWEAR JUST DROPPED",
  "EASY & SECURE CHECKOUT",
  "SHOP THE LATEST COLLECTION",
];

const navItems = [
  {
    label: "New Arrivals",
    href: "#new-arrivals",
    mega: ["New Arrivals", "Best Sellers", "Trending", "Editor Picks"],
  },
  {
    label: "Streetwear",
    href: "#streetwear",
    mega: ["New Arrivals", "T-Shirts", "Hoodies", "Sets", "Trending", "Best Sellers"],
  },
  {
    label: "T-Shirts",
    href: "#new-arrivals",
    mega: ["All T-Shirts", "Oversized", "Graphic", "Essential Basics"],
  },
  {
    label: "Hoodies",
    href: "#hoodies",
    mega: ["All Hoodies", "Heavyweight", "Zip Up", "Pullover"],
  },
  {
    label: "Accessories",
    href: "#accessories",
    mega: ["All Accessories", "Bags", "Hats", "Jewellery", "Other Essentials"],
  },
  {
    label: "Wigs",
    href: "#wigs",
    mega: ["All Wigs", "New Arrivals", "Best Sellers", "Human Hair"],
  },
  { label: "Sale", href: "#sale" },
];

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMegamenu, setActiveMegamenu] = useState<string | null>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAnnouncementIndex((current) => (current + 1) % announcementMessages.length);
    }, 3500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div className="announcement-bar">
        <div className="section-shell flex h-11 items-center justify-center text-center text-[10px] font-medium uppercase tracking-[0.18em] sm:text-[11px]">
          {announcementMessages[announcementIndex]}
        </div>
      </div>

      <div
        className={`border-b border-neutral-200 bg-white/90 backdrop-blur-md transition-all duration-200 ${
          isScrolled ? "shadow-[0_10px_28px_rgba(0,0,0,0.04)]" : "shadow-none"
        }`}
      >
        <div className="section-shell flex h-20 items-center justify-between gap-4 lg:h-24">
          <div className="hidden items-center gap-8 lg:flex lg:flex-1">
            <nav className="flex items-center gap-7">
              {navItems.slice(0, 5).map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setActiveMegamenu(item.label)}
                  onMouseLeave={() => setActiveMegamenu(null)}
                >
                  <a
                    href={item.href}
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-700 transition-colors hover:text-neutral-950"
                  >
                    {item.label}
                  </a>
                  {item.mega && activeMegamenu === item.label && (
                    <div className="absolute left-0 top-full mt-4 w-[240px] rounded-[1.2rem] border border-neutral-200 bg-white p-4 shadow-[0_18px_36px_rgba(15,15,15,0.08)]">
                      <div className="space-y-2">
                        {item.mega.map((link) => (
                          <a
                            key={link}
                            href={item.href}
                            className="block rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <a href="#top" className="flex flex-1 items-center justify-center lg:flex-none">
            <img src={elovynLogo} alt="Elovyn logo" className="h-16 w-auto lg:h-20" />
          </a>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            <button aria-label="Search" className="rounded-full p-2 text-neutral-900 transition-colors hover:bg-neutral-100">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button aria-label="Account" className="hidden rounded-full p-2 text-neutral-900 transition-colors hover:bg-neutral-100 sm:inline-flex">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button aria-label="Wishlist" className="hidden rounded-full p-2 text-neutral-900 transition-colors hover:bg-neutral-100 sm:inline-flex">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 sm:h-5 sm:w-5">
                <path d="M12 20.25s-7.5-4.62-9.5-8.85C1.14 8.95 3.07 4.5 7.16 4.5c2.02 0 3.35 1.04 4.09 2.16.74-1.12 2.07-2.16 4.09-2.16 4.09 0 6.02 4.45 4.66 7.9-2 4.23-9.5 8.85-9.5 8.85Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button aria-label="Shopping bag" className="relative rounded-full p-2 text-neutral-900 transition-colors hover:bg-neutral-100">
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-950 px-1 text-[9px] font-medium text-white">2</span>
            </button>
            <button
              aria-label="Open menu"
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-full p-2 text-neutral-900 transition-colors hover:bg-neutral-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="ml-auto flex h-full w-full max-w-sm flex-col bg-white p-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <img src={elovynLogo} alt="Elovyn logo" className="h-12 w-auto" />
                <button aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)} className="rounded-full p-2 hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-3">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block border-b border-neutral-200 py-3 text-base font-medium uppercase tracking-[0.18em] text-neutral-900"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="mt-auto space-y-3 border-t border-neutral-200 pt-6">
                <button className="btn-primary w-full">Account</button>
                <button className="btn-secondary w-full">Search</button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
