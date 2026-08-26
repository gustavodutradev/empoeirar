import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/env";

/**
 * Camada ÚNICA de envio de e-mail. Todo o resto do app manda e-mail só por aqui
 * — trocar de provedor (Resend, SES, etc.) no futuro é mudar SÓ este arquivo.
 *
 * Hoje: SMTP do Gmail (reaproveita o empoeirar@gmail.com já configurado).
 *
 * Fail-soft por design: NUNCA lança. Se o SMTP não estiver configurado, ou o
 * envio falhar, retorna false e loga — um e-mail transacional jamais pode
 * derrubar o checkout ou o webhook de pagamento.
 */

const FROM_NAME = "Empoeirar";

// Reaproveita a conexão entre invocações quentes da mesma função serverless.
let transporter: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // TLS direto (porta 465)
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_USER && env.SMTP_PASS);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const t = getTransport();
  if (!t) {
    console.warn("[email] SMTP não configurado — envio pulado:", input.subject);
    return false;
  }
  try {
    await t.sendMail({
      from: `"${FROM_NAME}" <${env.SMTP_USER}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return true;
  } catch (err) {
    console.error("[email] falha ao enviar:", err instanceof Error ? err.message : err);
    return false;
  }
}
