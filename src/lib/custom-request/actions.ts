"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/env";
import { buildCustomRequestEmail } from "@/lib/email/custom-request-template";
import { type EmailAttachment, sendEmail } from "@/lib/email/send";
import { IMAGE_EXTENSION, sniffImageType } from "@/lib/images/sniff";
import { reportError } from "@/lib/monitoring/report";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/site-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { CUSTOM_REQUEST_LIMITS, customRequestSchema } from "./schema";
import { customRequestWhatsAppUrl } from "./whatsapp";

export type CustomRequestResult =
  | { ok: true; reference: string; whatsappUrl: string }
  | { ok: false; error: string };

/**
 * Recebe o pedido de molde personalizado e manda por e-mail para o ateliê,
 * com as fotos em anexo. Formulário PÚBLICO (sem login), então:
 *
 *  1. Rate limit por IP (3 envios a cada 10 minutos), contado só quando o
 *     pedido é válido e vai virar e-mail.
 *  2. Honeypot: campo escondido preenchido = robô. Responde como sucesso para
 *     não ensinar o robô, mas não envia nada.
 *  3. Zod revalida todos os campos. Nome sem quebra de linha (vai no assunto).
 *  4. Fotos: no máximo 3, até 1 MB cada, e o TIPO É CONFERIDO PELOS BYTES
 *     (JPEG/PNG/WebP), nunca pelo nome ou pelo content-type enviado. O nome do
 *     anexo é gerado aqui.
 *  5. Nada fica guardado no banco nem no Storage: o pedido existe só no e-mail
 *     do ateliê (minimização de dados, LGPD).
 */
export async function submitCustomRequest(form: FormData): Promise<CustomRequestResult> {
  const parsed = customRequestSchema.safeParse({
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    description: String(form.get("description") ?? ""),
    website: String(form.get("website") ?? ""),
  });

  const reference = randomBytes(4).toString("hex").toUpperCase();

  if (!parsed.success) {
    const honeypot = parsed.error.issues.some((i) => i.path[0] === "website");
    if (honeypot) return { ok: true, reference, whatsappUrl: siteConfig.whatsappUrl };
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > CUSTOM_REQUEST_LIMITS.maxPhotos) {
    return { ok: false, error: `Envie no máximo ${CUSTOM_REQUEST_LIMITS.maxPhotos} fotos.` };
  }

  const attachments: EmailAttachment[] = [];
  for (const [index, file] of files.entries()) {
    if (file.size > CUSTOM_REQUEST_LIMITS.maxPhotoBytes) {
      return { ok: false, error: "Uma das fotos ficou grande demais. Tente outra foto." };
    }
    const content = Buffer.from(await file.arrayBuffer());
    const type = sniffImageType(content);
    if (!type) return { ok: false, error: "Envie fotos em JPG, PNG ou WebP." };
    attachments.push({
      filename: `molde-${reference}-${index + 1}.${IMAGE_EXTENSION[type]}`,
      content,
      contentType: type,
    });
  }

  // Rate limit só antes do que custa (o e-mail): erro de digitação não gasta
  // as tentativas do cliente.
  const ip = clientIp(await headers());
  if (!(await allowRequest(createAdminClient(), `custom-request:${ip}`, 3, 600))) {
    return { ok: false, error: "Muitos envios em pouco tempo. Tente de novo em alguns minutos." };
  }

  const recipients = [...new Set([siteConfig.email, env.ORDER_NOTIFY_EMAIL].filter(Boolean))];
  const { subject, html } = buildCustomRequestEmail({
    reference,
    name: data.name,
    email: data.email,
    phone: data.phone,
    description: data.description,
    photoCount: attachments.length,
  });

  const sent = await sendEmail({
    to: recipients as string[],
    subject,
    html,
    replyTo: data.email,
    attachments,
  });

  if (!sent) {
    await reportError("submitCustomRequest", "falha no envio do e-mail", { referencia: reference });
    return {
      ok: false,
      error: "Não conseguimos enviar agora. Fale com a gente direto pelo WhatsApp.",
    };
  }

  return {
    ok: true,
    reference,
    whatsappUrl: customRequestWhatsAppUrl({
      reference,
      name: data.name,
      description: data.description,
    }),
  };
}
