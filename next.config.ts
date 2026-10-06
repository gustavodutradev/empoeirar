import type { NextConfig } from "next";

// Valida as variaveis de ambiente no momento do build/start. Se algo estiver
// faltando ou invalido, o processo QUEBRA aqui — antes de virar bug em prod.
import { env } from "./src/env";

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

/**
 * Otimizacao de imagens (next/image). A Vercel baixa a foto original do bucket,
 * gera a versao no tamanho pedido em WebP e guarda em cache.
 *
 * - remotePatterns restrito ao bucket PUBLICO `produtos` do NOSSO Supabase.
 *   Sem essa restricao, /_next/image viraria um proxy aberto: qualquer um
 *   poderia mandar otimizar imagens de qualquer site, gastando a nossa cota
 *   (e a Vercel buscaria URLs arbitrarias, risco de SSRF).
 * - Poucos tamanhos e uma qualidade so: cada combinacao (foto x largura x
 *   qualidade) e uma "transformacao", e o plano Hobby inclui 5 mil por mes.
 * - Cache longo: as fotos do admin tem nome unico (uuid) e nunca mudam no
 *   mesmo caminho; trocar a foto gera outro arquivo, outra URL.
 */
const images: NextConfig["images"] = {
  remotePatterns: [
    new URL(`${new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin}/storage/v1/object/public/produtos/**`),
  ],
  deviceSizes: [640, 828, 1080, 1200],
  imageSizes: [96, 192, 256, 384],
  qualities: [75],
  formats: ["image/webp"],
  minimumCacheTTL: 60 * 60 * 24 * 31,
};

const nextConfig: NextConfig = {
  images,
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
