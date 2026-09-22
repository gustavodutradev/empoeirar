import { Arapey, Fraunces } from "next/font/google";

// Definidas num módulo próprio porque dois documentos usam as fontes: o root
// layout e o global-error (que substitui o layout e monta seu próprio <html>).

// Corpo: Arapey (serifa leve, Google Font livre para uso comercial).
export const arapey = Arapey({
  variable: "--font-arapey",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Titulos: Fraunces (serifa de display livre) como substituta da "Higuen
// Elegant Serif", que nao e livre para web comercial. Trocar por Higuen aqui
// se/quando a fonte for licenciada.
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const fontVariables = `${arapey.variable} ${fraunces.variable}`;
