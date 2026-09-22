import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Variaveis de ambiente validadas no build (importado por next.config.ts).
 * Segredos ficam em `server` e nunca levam o prefixo NEXT_PUBLIC_.
 */
/**
 * Deploys de Preview da Vercel tem uma URL por branch, entao nao da para fixar
 * NEXT_PUBLIC_SITE_URL no painel para eles. Se a variavel nao estiver definida
 * E for um Preview, usa a URL da branch (variavel de sistema que a Vercel expoe
 * com prefixo NEXT_PUBLIC_ para Next.js). Em Production e local nada muda:
 * a variavel continua obrigatoria e o build falha sem ela.
 */
function previewSiteUrl(): string | undefined {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview") return undefined;
  const host = process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL;
  return host ? `https://${host}` : undefined;
}

export const env = createEnv({
  server: {
    // Ignora a RLS: uso restrito ao servidor.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // --- Mercado Pago ---
    // Opcionais: sem elas o checkout nao oferece pagamento.
    MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
    // Segredo da assinatura do webhook (painel do MP > Webhooks): valida que a
    // notificacao veio mesmo do Mercado Pago.
    MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),

    // --- E-mail transacional (SMTP do Gmail, senha de app) ---
    // Opcionais: sem eles o envio e pulado e registrado no log.
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    // Destino dos alertas de erro e de pagamento (item 42). Opcional: sem ele
    // os alertas ficam so no log da Vercel.
    ADMIN_ALERT_EMAIL: z.email().optional(),

    // --- Melhor Envio ---
    // Opcionais: sem o token o checkout mostra "frete a calcular".
    MELHORENVIO_TOKEN: z.string().min(1).optional(),
    // "false" usa producao; qualquer outro valor (ou vazio) usa o sandbox.
    MELHORENVIO_SANDBOX: z.string().optional(),
    // CEP de origem dos envios. Vazio = placeholder de BH (lib/shipping).
    MELHORENVIO_FROM_CEP: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    // Protegida pela RLS, por isso pode ir ao cliente.
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // URL canonica do site (SEO, links absolutos, metadata).
    NEXT_PUBLIC_SITE_URL: z.url(),
  },
  // Referencia estatica: o Next so inlina NEXT_PUBLIC_* assim no build.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? previewSiteUrl(),
  },
  // "VAR=" conta como ausente, em vez de passar como string valida.
  emptyStringAsUndefined: true,
});
