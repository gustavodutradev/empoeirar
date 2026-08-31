import type { NextConfig } from "next";

// Valida as variaveis de ambiente no momento do build/start. Se algo estiver
// faltando ou invalido, o processo QUEBRA aqui — antes de virar bug em prod.
import "./src/env";

/**
 * Security headers ESTATICOS (iguais em todo request). A CSP NAO fica aqui:
 * ela tem nonce por request e e aplicada no middleware (src/middleware.ts).
 */
const securityHeaders = [
  // Impede o browser de "adivinhar" o content-type (anti MIME-sniffing).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti-clickjacking para browsers antigos (a CSP frame-ancestors cobre o resto).
  { key: "X-Frame-Options", value: "DENY" },
  // Nao vaza a URL completa como referer para outras origens.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Forca HTTPS por 2 anos (em prod/Vercel; browsers ignoram em http local).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Desliga APIs sensiveis do browser que nao usamos.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Upload de foto de produto vai por server action. Mesmo comprimindo no
  // cliente, damos folga no limite de body (default 1MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
