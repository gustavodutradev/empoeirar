import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validacao de variaveis de ambiente (t3-env + Zod).
 *
 * Fronteira de seguranca central deste arquivo:
 * - `server`: segredos. NUNCA vao para o cliente. Se voce tentar ler uma
 *   dessas em um Client Component, o t3-env LANCA um erro — o segredo nao
 *   chega a existir no bundle do browser.
 * - `client`: o que pode ir ao browser. Por regra do Next, exige o prefixo
 *   NEXT_PUBLIC_ (e o t3-env obriga isso no schema).
 *
 * A validacao roda no build (importado por next.config.ts). Consequencia:
 * env faltando ou invalido = build QUEBRA, em vez de virar `undefined`
 * silencioso que so estoura em producao.
 */
export const env = createEnv({
  server: {
    // Chave service_role do Supabase: ela BYPASSA a RLS (acesso total ao
    // banco). Por isso mora aqui, so no servidor. Nunca prefixar NEXT_PUBLIC_.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // --- Mercado Pago (Fase 2) ---
    // OPCIONAIS de proposito: sem elas, o app roda normal e o checkout so nao
    // oferece pagamento (degrada com aviso). Preencher quando a conta do Jane
    // estiver pronta. Access token = SEGREDO (nunca no cliente, nunca NEXT_PUBLIC_).
    MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
    // Segredo da assinatura do webhook (painel do MP > Webhooks): valida que a
    // notificacao veio mesmo do Mercado Pago.
    MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),

    // --- E-mail transacional (SMTP — reusa o Gmail já configurado) ---
    // OPCIONAIS: sem eles, o envio de e-mail é pulado (log de aviso), o app
    // segue normal. Senha = "app password" do Gmail (SEGREDO, só no servidor).
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),

    // --- Melhor Envio (frete — Fase 2) ---
    // OPCIONAIS: sem o token, o checkout degrada para "frete a calcular".
    // Token de acesso pessoal (painel do ME). SEGREDO, so no servidor.
    MELHORENVIO_TOKEN: z.string().min(1).optional(),
    // "true" usa o ambiente sandbox (testes, sem envio real). Default: sandbox.
    MELHORENVIO_SANDBOX: z.string().optional(),
    // CEP de ORIGEM (de onde a Jane despacha). So digitos ou com traco.
    // Enquanto nao temos o real, o codigo usa um placeholder de BH.
    MELHORENVIO_FROM_CEP: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    // Chave anon/publishable: e protegida pela RLS, entao pode ir ao cliente.
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // URL canonica do site (SEO, links absolutos, metadata).
    NEXT_PUBLIC_SITE_URL: z.url(),
  },
  // Client vars precisam ser referenciadas estaticamente aqui para o Next
  // conseguir inlina-las no bundle no momento do build.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  // "VAR=" (string vazia) e tratada como ausente — pega .env preenchido pela
  // metade em vez de deixar passar uma string vazia como se fosse valida.
  emptyStringAsUndefined: true,
});
