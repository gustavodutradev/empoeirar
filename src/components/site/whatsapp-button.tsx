"use client";

import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site-config";

/** Rotas onde o botão atrapalha: admin, e checkout/carrinho (cobriria o botão de pagar no celular). */
const HIDDEN_PREFIXES = ["/admin", "/checkout", "/carrinho"];

const URL_WITH_TEXT = (() => {
  const url = new URL(siteConfig.whatsappUrl);
  url.searchParams.set("text", "Olá! Vim pelo site da Empoeirar.");
  return url.toString();
})();

/**
 * Botão flutuante de WhatsApp. O público vem do Instagram e do WhatsApp, então
 * o atalho fica visível em todas as páginas da vitrine.
 */
export function WhatsAppButton() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <a
      href={URL_WITH_TEXT}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Falar com a Empoeirar pelo WhatsApp, ${siteConfig.whatsappLabel}`}
      className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:right-6 sm:bottom-6"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5z" />
      </svg>
      WhatsApp
    </a>
  );
}
