import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

/**
 * Open Graph padrão do site (prévia de links no WhatsApp/Instagram/Facebook).
 *
 * Atenção ao merge do Next: quando uma página define `openGraph`, ele
 * SUBSTITUI o do layout inteiro (não mescla campo a campo). Por isso as páginas
 * que personalizam a prévia espalham este objeto: `{ ...defaultOpenGraph, ... }`.
 */
export const defaultOpenGraph = {
  type: "website",
  locale: "pt_BR",
  siteName: siteConfig.name,
  images: [{ url: "/logo-empoeirar.png", alt: siteConfig.name }],
} satisfies NonNullable<Metadata["openGraph"]>;

/** Páginas que não devem aparecer no Google (placeholder, área logada). */
export const noIndex: Metadata["robots"] = { index: false, follow: true };
