import "server-only";
import { env } from "@/env";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type AlertDetails,
  type AlertInput,
  buildAlertEmail,
  errorInfo,
  fingerprint,
} from "./format";
import { createAlertThrottle } from "./throttle";

/**
 * Monitoramento próprio, sem fornecedor externo: todo erro relevante vira uma
 * linha estruturada no log da Vercel e, se ADMIN_ALERT_EMAIL estiver
 * configurado, um e-mail para o admin pelo SMTP que o site já usa.
 *
 * Controle de volume em duas camadas, porque um erro em loop (ou alguém
 * provocando erros de propósito) não pode virar centenas de e-mails:
 *  1. Por instância, em memória: o mesmo alerta no máximo 1x por hora e no
 *     máximo MAX_PER_INSTANCE e-mails a cada 10 minutos. Funciona mesmo com o
 *     banco fora do ar, que é justamente quando mais chegam erros.
 *  2. Entre instâncias, pela tabela rate_limit: o mesmo alerta 1x por hora e
 *     no máximo GLOBAL_PER_HOUR alertas por hora no total.
 *
 * NUNCA lança: monitoramento com defeito não pode derrubar quem o chamou.
 */

const SAME_ALERT_WINDOW_MS = 60 * 60 * 1000;
const INSTANCE_WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_INSTANCE = 10;
const GLOBAL_PER_HOUR = 30;

const allowedInThisInstance = createAlertThrottle({
  sameAlertWindowMs: SAME_ALERT_WINDOW_MS,
  windowMs: INSTANCE_WINDOW_MS,
  maxPerWindow: MAX_PER_INSTANCE,
});

/** true = pode enviar. Se o banco falhar, confia só na camada em memória. */
async function allowedGlobally(fp: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const hit = async (key: string, limit: number) => {
      const { data, error } = await admin.rpc("rate_limit_hit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: 3600,
      });
      return error ? true : data === true;
    };
    return (await hit(`alert:${fp}`, 1)) && (await hit("alert:global", GLOBAL_PER_HOUR));
  } catch {
    return true;
  }
}

/** Alerta o admin (log sempre; e-mail se configurado e dentro do limite). */
export async function notifyAdmin(alert: AlertInput & { fingerprintKey: string }): Promise<void> {
  try {
    const fp = fingerprint(alert.kind, alert.fingerprintKey);
    // Uma linha JSON por alerta: dá para filtrar por "[alert]" nos logs da Vercel.
    console.error(
      "[alert]",
      JSON.stringify({ kind: alert.kind, title: alert.title, fp, ...alert.details }),
    );

    if (!env.ADMIN_ALERT_EMAIL) return;
    if (!allowedInThisInstance(fp, Date.now())) return;
    if (!(await allowedGlobally(fp))) return;

    const { subject, html } = buildAlertEmail(alert, new Date());
    await sendEmail({ to: env.ADMIN_ALERT_EMAIL, subject, html });
  } catch (err) {
    console.error("[alert] falha no próprio alerta:", err instanceof Error ? err.message : err);
  }
}

/**
 * Registra um erro inesperado. `scope` identifica o ponto do código
 * ("webhook", "create_order"...). `details` só pode ter ids e dados técnicos:
 * nunca nome, e-mail, CPF ou endereço de cliente.
 */
export async function reportError(
  scope: string,
  err: unknown,
  details: AlertDetails = {},
): Promise<void> {
  const info = errorInfo(err);
  await notifyAdmin({
    kind: "error",
    title: `${scope}: ${info.message}`,
    fingerprintKey: `${scope}|${info.name}|${info.message}`,
    details: { scope, erro: `${info.name}: ${info.message}`, digest: info.digest, ...details },
    stack: info.stack,
  });
}
