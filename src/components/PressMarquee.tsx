const pressItems = [
  { logo: "TECHCRUNCH", quote: "Best e-bike for commuters" },
  { logo: "THE VERGE", quote: "It's truly a beast in all the best possible ways" },
  { logo: "TIME", quote: "Best Inventions Award" },
  { logo: "GQ", quote: "GQ Tech Award Best e-bike" },
  { logo: "MASHABLE", quote: "That fork!" },
  { logo: "WALLPAPER*", quote: "A new e-bike glides into town" },
];

export const PressMarquee = () => {
  return (
    <section className="py-12 bg-charcoal overflow-hidden border-y border-border/20">
      <div className="relative">
        <div className="flex animate-marquee">
          {[...pressItems, ...pressItems, ...pressItems, ...pressItems].map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-8 px-12 flex-shrink-0"
            >
              <span className="text-lg md:text-xl font-bold text-foreground/40 tracking-wider whitespace-nowrap">
                {item.logo}
              </span>
              <span className="text-sm md:text-base text-foreground/70 italic whitespace-nowrap">
                "{item.quote}"
              </span>
              <span className="text-foreground/20">•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
