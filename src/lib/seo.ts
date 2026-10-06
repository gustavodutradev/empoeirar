/**
 * SEO (item 37): funções PURAS que montam URLs, descrições e os dados
 * estruturados (JSON-LD, padrão schema.org) que o Google lê. Sem banco e sem
 * env: recebem tudo por parâmetro, para poderem ser testadas.
 */

/** Rotas privadas ou sem valor para busca: ficam fora do Google (robots.txt). */
export const PRIVATE_PATHS = [
  "/admin",
  "/api/",
  "/auth/",
  "/conta",
  "/checkout",
  "/carrinho",
  "/pedido/",
  "/entrar",
] as const;

/** Páginas institucionais publicadas (as que ainda são placeholder ficam de fora). */
export const STATIC_PAGES = [
  "/",
  "/produtos",
  "/quem-somos",
  "/como-comprar",
  "/faq",
  "/trocas-devolucoes",
  "/politica-envio",
  "/privacidade",
  "/termos",
] as const;

/** Largura da imagem de prévia. Precisa estar em `images.deviceSizes` (next.config). */
export const OG_IMAGE_WIDTH = 1200;

export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, `${siteUrl.replace(/\/$/, "")}/`).toString();
}

/**
 * Imagem da prévia de link (WhatsApp, Instagram, Facebook): a foto passa pelo
 * otimizador do Next (/_next/image), que devolve uma versão de 1200px em vez
 * do arquivo original de ~750 KB. O WhatsApp costuma não mostrar a prévia
 * quando a imagem passa de ~600 KB.
 */
export function ogImagePath(src: string): string {
  const params = new URLSearchParams({ url: src, w: String(OG_IMAGE_WIDTH), q: "75" });
  return `/_next/image?${params}`;
}

/** Texto em uma linha e com no máximo `max` caracteres, cortado em palavra. */
export function summarize(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:]+$/, "")}…`;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function productDescription(p: {
  name: string;
  description: string | null;
  minPriceCents: number | null;
}): string {
  if (p.description?.trim()) return summarize(p.description);
  const price =
    p.minPriceCents && p.minPriceCents > 0
      ? ` A partir de ${brl.format(p.minPriceCents / 100)}.`
      : "";
  return `${p.name}: molde de madeira para cerâmica, feito à mão pela Empoeirar.${price}`;
}

type JsonLd = Record<string, unknown>;

export type ProductForJsonLd = {
  id: string;
  name: string;
  description: string | null;
  url: string;
  images: string[];
  variants: { id: string; label: string; price_cents: number }[];
};

/** Preço no formato do schema.org: ponto decimal, 2 casas ("149.00"). */
function price(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * JSON-LD de produto, no formato que o Google usa para mostrar preço e
 * disponibilidade nos resultados (e nas listagens gratuitas do Shopping).
 *
 * - Uma variante: um `Product` com um `Offer`.
 * - Várias variantes (P/M/G...) na mesma página: `ProductGroup` com um
 *   `Product` por variante (`hasVariant`), que é o formato que o Google indica
 *   para variantes escolhidas na própria página.
 * - Variante com preço zero é ignorada (o Google exige preço > 0). Sem
 *   nenhuma variante válida, devolve null e a página não publica JSON-LD.
 * - Disponibilidade: InStock. O produto é feito sob encomenda e o estoque não
 *   é controlado na venda; "MadeToOrder" não está entre os valores que o
 *   Google aceita.
 * - Os valores vêm da MESMA consulta que monta a página: o Google penaliza
 *   dados estruturados que não batem com o que o cliente vê.
 */
export function buildProductJsonLd(p: ProductForJsonLd, brandName: string): JsonLd | null {
  const variants = p.variants.filter((v) => v.price_cents > 0);
  if (variants.length === 0) return null;

  const description = p.description?.trim() ? summarize(p.description, 5000) : undefined;
  const brand = { "@type": "Brand", name: brandName };
  const image = p.images.length > 0 ? p.images : undefined;
  const offer = (cents: number) => ({
    "@type": "Offer",
    url: p.url,
    price: price(cents),
    priceCurrency: "BRL",
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
  });

  if (variants.length === 1) {
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description,
      image,
      sku: variants[0].id,
      brand,
      offers: offer(variants[0].price_cents),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: p.name,
    description,
    image,
    url: p.url,
    brand,
    productGroupID: p.id,
    variesBy: "https://schema.org/size",
    hasVariant: variants.map((v) => ({
      "@type": "Product",
      name: `${p.name} — ${v.label}`,
      sku: v.id,
      size: v.label,
      image,
      offers: offer(v.price_cents),
    })),
  };
}

/** JSON-LD da empresa (home): liga o site ao Instagram e ao WhatsApp. */
export function buildOrganizationJsonLd(o: {
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
  email: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: o.name,
    url: o.url,
    logo: o.logo,
    sameAs: o.sameAs,
    email: o.email,
  };
}

/**
 * Serializa JSON-LD para ir dentro de <script type="application/ld+json">.
 *
 * SEGURANÇA: nome e descrição do produto vêm do banco. Um "</script>" no
 * texto fecharia a tag e o resto viraria HTML executável (XSS). Escapar "<"
 * como < resolve: continua sendo JSON válido com o mesmo valor, mas o
 * navegador nunca vê uma tag. ">" e "&" vão junto por garantia, e U+2028/
 * U+2029 porque quebram o parse em alguns motores.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
