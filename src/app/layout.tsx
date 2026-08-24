import type { Metadata } from "next";
import { Arapey, Fraunces } from "next/font/google";
import { CartSync } from "@/components/site/cart-sync";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "./globals.css";

// Corpo: Arapey (serifa leve, Google Font livre para uso comercial).
const arapey = Arapey({
  variable: "--font-arapey",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Titulos: Fraunces (serifa de display livre) como substituta da "Higuen
// Elegant Serif", que nao e livre para web comercial. Trocar por Higuen aqui
// se/quando a fonte for licenciada.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Empoeirar — moldes e ferramentas para cerâmica",
    template: "%s · Empoeirar",
  },
  description:
    "Moldes e ferramentas de madeira para ceramistas: puxadores, conjuntos orgânicos, moldes geométricos e lúdicos, e peças especiais.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${arapey.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartSync />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
