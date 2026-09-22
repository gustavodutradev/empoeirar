import type { Metadata, Viewport } from "next";
import { CartSync } from "@/components/site/cart-sync";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Empoeirar — moldes e ferramentas para cerâmica",
    template: "%s · Empoeirar",
  },
  description:
    "Moldes e ferramentas de madeira para ceramistas: puxadores, conjuntos orgânicos, moldes geométricos e lúdicos, e peças especiais.",
};

// Cor da barra do navegador no mobile (Chrome Android / Safari) = creme do site.
export const viewport: Viewport = {
  themeColor: "#f2f1e8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartSync />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
