import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  buildOrganizationJsonLd,
  buildProductJsonLd,
  ogImagePath,
  productDescription,
  serializeJsonLd,
  summarize,
} from "./seo";

const SITE = "https://empoeirar.com.br";
const IMG = "https://abc.supabase.co/storage/v1/object/public/produtos/a b.webp";

const base = {
  id: "p1",
  name: "Puxador Banana",
  description: "Molde entalhado à mão.",
  url: `${SITE}/produtos/banana`,
  images: [IMG],
};

describe("absoluteUrl", () => {
  it("junta base e caminho, com ou sem barra final", () => {
    expect(absoluteUrl(SITE, "/produtos")).toBe(`${SITE}/produtos`);
    expect(absoluteUrl(`${SITE}/`, "/produtos")).toBe(`${SITE}/produtos`);
  });
});

describe("ogImagePath", () => {
  it("passa a foto pelo otimizador em 1200px, com a URL codificada", () => {
    const path = ogImagePath(IMG);
    const params = new URL(path, SITE).searchParams;
    expect(path.startsWith("/_next/image?")).toBe(true);
    expect(params.get("url")).toBe(IMG);
    expect(params.get("w")).toBe("1200");
    expect(params.get("q")).toBe("75");
  });
});

describe("summarize / productDescription", () => {
  it("mantém texto curto e achata quebras de linha", () => {
    expect(summarize("Linha 1\n\n  linha 2")).toBe("Linha 1 linha 2");
  });

  it("corta texto longo em palavra, com reticências", () => {
    const out = summarize("palavra ".repeat(60), 160);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("palavra…")).toBe(true);
  });

  it("sem descrição, gera uma com o preço mínimo", () => {
    expect(productDescription({ name: "Oval", description: null, minPriceCents: 4900 })).toBe(
      "Oval: molde de madeira para cerâmica, feito à mão pela Empoeirar. A partir de R$\u00a049,00.",
    );
  });
});

describe("buildProductJsonLd", () => {
  it("uma variante: Product com Offer em BRL", () => {
    const ld = buildProductJsonLd(
      { ...base, variants: [{ id: "v1", label: "Único", price_cents: 14900 }] },
      "Empoeirar",
    );
    expect(ld).toMatchObject({
      "@type": "Product",
      name: "Puxador Banana",
      image: [IMG],
      sku: "v1",
      brand: { "@type": "Brand", name: "Empoeirar" },
      offers: {
        "@type": "Offer",
        price: "149.00",
        priceCurrency: "BRL",
        availability: "https://schema.org/InStock",
        url: `${SITE}/produtos/banana`,
      },
    });
  });

  it("várias variantes: ProductGroup com um Product por tamanho", () => {
    const ld = buildProductJsonLd(
      {
        ...base,
        variants: [
          { id: "vp", label: "P", price_cents: 9900 },
          { id: "vg", label: "G", price_cents: 12900 },
        ],
      },
      "Empoeirar",
    ) as { "@type": string; productGroupID: string; hasVariant: Record<string, unknown>[] };
    expect(ld["@type"]).toBe("ProductGroup");
    expect(ld.productGroupID).toBe("p1");
    expect(ld.hasVariant).toHaveLength(2);
    expect(ld.hasVariant[1]).toMatchObject({
      name: "Puxador Banana — G",
      size: "G",
      offers: { price: "129.00" },
    });
  });

  it("ignora variante com preço zero; sem nenhuma válida, não publica", () => {
    const one = buildProductJsonLd(
      {
        ...base,
        variants: [
          { id: "v0", label: "Grátis", price_cents: 0 },
          { id: "v1", label: "M", price_cents: 5000 },
        ],
      },
      "Empoeirar",
    );
    expect(one).toMatchObject({ "@type": "Product", sku: "v1" });
    expect(
      buildProductJsonLd({ ...base, variants: [{ id: "v0", label: "x", price_cents: 0 }] }, "E"),
    ).toBeNull();
  });

  it("sem foto: omite image em vez de mandar lista vazia", () => {
    const ld = buildProductJsonLd(
      { ...base, images: [], variants: [{ id: "v1", label: "Único", price_cents: 100 }] },
      "Empoeirar",
    );
    expect(JSON.parse(serializeJsonLd(ld ?? {}))).not.toHaveProperty("image");
  });
});

describe("serializeJsonLd", () => {
  it("não deixa texto do banco fechar a tag <script> (XSS)", () => {
    const evil = '</script><script>alert("xss")</script>';
    const out = serializeJsonLd({ name: evil, desc: "a & b > c" });
    expect(out).not.toContain("</script");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    // Continua sendo JSON válido, com o MESMO valor.
    expect(JSON.parse(out)).toEqual({ name: evil, desc: "a & b > c" });
  });

  it("escapa U+2028 e U+2029", () => {
    const out = serializeJsonLd({ t: "a\u2028b\u2029c" });
    expect(out).toContain("\\u2028");
    expect(JSON.parse(out).t).toBe("a\u2028b\u2029c");
  });
});

describe("buildOrganizationJsonLd", () => {
  it("monta a organização com redes sociais", () => {
    expect(
      buildOrganizationJsonLd({
        name: "Empoeirar",
        url: SITE,
        logo: `${SITE}/logo-empoeirar.png`,
        sameAs: ["https://instagram.com/empoeirar"],
        email: "x@y.com",
      }),
    ).toMatchObject({ "@type": "Organization", sameAs: ["https://instagram.com/empoeirar"] });
  });
});
