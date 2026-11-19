interface MiddlewareEnv {
  DB?: D1Database;
}

interface PagesMiddlewareContext {
  request: Request;
  env: MiddlewareEnv;
  next: () => Promise<Response>;
}

type ProductMeta = {
  id: string;
  title: string;
  price: number;
  description: string | null;
  image_url: string | null;
  images_json: string | null;
  updated_at: string;
};

const canonicalOrigin = "https://elovyn.store";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function productDescription(value: string | null, title: string) {
  return (value || `Shop ${title} at Elovyn.`)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function metadataMarkup(product: ProductMeta, imageUrl: string) {
  const title = `${product.title} (${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(product.price))})`;
  const description = productDescription(product.description, product.title);
  const canonicalUrl = `${canonicalOrigin}/products/${encodeURIComponent(product.id)}`;
  const values: Array<[string, string, string]> = [
    ["property", "og:type", "product"],
    ["property", "og:site_name", "ELOVYN"],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:image", imageUrl],
    ["property", "og:image:secure_url", imageUrl],
    ["property", "og:image:width", "1200"],
    ["property", "og:image:height", "1200"],
    ["property", "og:url", canonicalUrl],
    ["name", "description", description],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
    ["name", "twitter:image", imageUrl],
  ];
  return values.map(([attribute, name, content]) =>
    `<meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}">`,
  ).join("");
}

const replaceableMetadata = [
  'meta[property^="og:"]',
  'meta[name^="og:"]',
  'meta[name^="twitter:"]',
];

export async function onRequest(context: PagesMiddlewareContext) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/products?\/([^/]+)\/?$/);
  if (request.method !== "GET" || !match || !env.DB) return next();

  let productKey: string;
  try {
    productKey = decodeURIComponent(match[1]);
  } catch {
    return next();
  }

  let product: ProductMeta | null;
  try {
    product = await env.DB.prepare(`
      SELECT id, title, price, description, image_url, images_json, updated_at
      FROM products
      WHERE is_listed = 1 AND (id = ? OR handle = ?)
      LIMIT 1
    `).bind(productKey, productKey).first<ProductMeta>();
  } catch (error) {
    console.error("Could not load product for Open Graph metadata.", error);
    return next();
  }
  if (!product) return next();

  const response = await next();
  if (!response.headers.get("content-type")?.includes("text/html")) return response;

  const version = encodeURIComponent(product.updated_at || "1");
  const imageUrl = `${canonicalOrigin}/api/og-image/${encodeURIComponent(product.id)}?v=${version}`;
  const title = `${product.title} — ELOVYN`;
  const markup = metadataMarkup(product, imageUrl);
  let rewriter = new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(title, { html: false });
      },
    });
  replaceableMetadata.forEach((selector) => {
    rewriter = rewriter.on(selector, {
      element(element) {
        element.remove();
      },
    });
  });
  const rewritten = rewriter.on("head", {
    element(element) {
      element.append(markup, { html: true });
    },
  })
    .transform(response);
  const headers = new Headers(rewritten.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(rewritten.body, {
    status: rewritten.status,
    statusText: rewritten.statusText,
    headers,
  });
}
