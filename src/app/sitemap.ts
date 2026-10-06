import type { MetadataRoute } from "next";
import { env } from "@/env";
import { getSitemapData } from "@/lib/queries/catalog";
import { absoluteUrl, STATIC_PAGES } from "@/lib/seo";

/**
 * /sitemap.xml (item 37): lista das páginas públicas para o Google achar
 * mais rápido, principalmente os produtos. Gerado do banco a cada hora:
 * produto novo publicado pelo admin entra sozinho; rascunho e arquivado não
 * (a consulta respeita a RLS, que só mostra `published`).
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = env.NEXT_PUBLIC_SITE_URL;
  const { products, categorySlugs } = await getSitemapData();

  const staticEntries = STATIC_PAGES.map((path) => ({
    url: absoluteUrl(site, path),
    changeFrequency:
      path === "/" || path === "/produtos" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "/" ? 1 : path === "/produtos" ? 0.9 : 0.4,
  }));

  const categoryEntries = categorySlugs.map((slug) => ({
    url: absoluteUrl(site, `/produtos?categoria=${encodeURIComponent(slug)}`),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const productEntries = products.map((p) => ({
    url: absoluteUrl(site, `/produtos/${encodeURIComponent(p.slug)}`),
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
