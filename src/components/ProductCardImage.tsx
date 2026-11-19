import { useEffect, useMemo, useState } from "react";

type ProductCardImageProps = {
  imageUrl: string | null;
  imagesJson: string;
  alt: string;
  fallback: string;
};

function parseImages(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((image): image is string => typeof image === "string" && image.trim().length > 0).map((image) => image.trim())
      : [];
  } catch {
    return [];
  }
}

export function ProductCardImage({ imageUrl, imagesJson, alt, fallback }: ProductCardImageProps) {
  const gallery = useMemo(() => [...new Set([
    ...(imageUrl?.trim() ? [imageUrl.trim()] : []),
    ...parseImages(imagesJson),
  ])], [imageUrl, imagesJson]);
  const candidates = useMemo(() => [...gallery, ...(fallback ? [fallback] : [])], [fallback, gallery]);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  useEffect(() => setFailedImages(new Set()), [candidates]);

  const primary = candidates.find((src) => !failedImages.has(src));
  const secondary = gallery.find((src) => src !== primary && !failedImages.has(src));

  if (!primary) {
    return <div role="img" aria-label={`${alt} image unavailable`} className="grid h-full w-full place-items-center bg-neutral-100 text-xs font-semibold tracking-[0.25em] text-neutral-400">ELOVYN</div>;
  }

  const markFailed = (src: string) => {
    setFailedImages((current) => new Set(current).add(src));
  };

  return (
    <span className="relative block h-full w-full overflow-hidden bg-neutral-100">
      <img
        src={primary}
        alt={alt}
        loading="lazy"
        onError={() => markFailed(primary)}
        className={`h-full w-full object-cover transition-[opacity,transform] duration-500 ${secondary ? "group-hover:opacity-0" : "group-hover:scale-105"}`}
      />
      {secondary && (
        <img
          src={secondary}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => markFailed(secondary)}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}
    </span>
  );
}
