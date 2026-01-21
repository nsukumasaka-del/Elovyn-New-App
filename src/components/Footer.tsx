import { motion } from "framer-motion";
import elovynLogo from "../assets/ELOVYN THE FINAL.png";

const footerLinks = {
  "Hair Products": ["Cruiser", "Cruiser ST", "Cross", "Cross ST", "Compare bikes"],
  "Accessories": ["All accessories", "Bags", "Locks", "Lights"],
  "Company": ["About us", "Careers", "Press", "Stories"],
  "Support": ["Help center", "Contact us", "Stores", "Test rides"],
};

const socialLinks = [
  { name: "Instagram", href: "#" },
  { name: "Twitter", href: "#" },
  { name: "Facebook", href: "#" },
  { name: "YouTube", href: "#" },
];

export const Footer = () => {
  return (
    <footer className="bg-background border-t border-border/30 pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Logo & Socials */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
            <a href="#" className="inline-block">
              <img src={elovynLogo} alt="Elovyn Logo" className="h-48 w-auto" />
            </a>
            <p className="text-sm text-foreground/50 mt-4 mb-6 max-w-xs">
              The ultimate connected e-bikes designed in Belgium, assembled in Europe.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm text-foreground/50 hover:text-foreground transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-foreground/50 hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-border/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-foreground/40">
            © {new Date().getFullYear()} Cowboy. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors">
              Cookie Settings
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
