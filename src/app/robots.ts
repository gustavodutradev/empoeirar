import type { MetadataRoute } from "next";
import { env } from "@/env";
import { absoluteUrl, PRIVATE_PATHS } from "@/lib/seo";

/**
 * /robots.txt (item 37). Libera a vitrine e pede para os buscadores não
 * visitarem área logada, checkout e API.
 *
 * NÃO é controle de acesso: é um pedido educado que robôs bem-comportados
 * seguem. Quem protege /admin e /conta continua sendo login + RLS.
 *
 * /_next/ NÃO entra na lista: as imagens otimizadas (/_next/image), usadas na
 * prévia de links e nos resultados do Google, precisam ser acessíveis.
 *
 * Fora de produção (Preview, local), bloqueia tudo: deploy de teste não deve
 * aparecer em busca nem competir com o site real.
 */
export default function robots(): MetadataRoute.Robots {
  const site = env.NEXT_PUBLIC_SITE_URL;

  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] },
    sitemap: absoluteUrl(site, "/sitemap.xml"),
  };
}
