/**
 * E-mail para o ateliê com um pedido de molde personalizado. HTML simples,
 * todo valor do cliente passa por escapeHtml (o nome e a descrição são texto
 * livre de um formulário público).
 */

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

export function buildCustomRequestEmail(input: {
  reference: string;
  name: string;
  email: string;
  phone: string;
  description: string;
  photoCount: number;
}): { subject: string; html: string } {
  const phone = input.phone ? formatPhone(input.phone) : "não informado";
  const subject = `Molde personalizado nº ${input.reference} — ${input.name}`;
  const html = `<!doctype html>
<html lang="pt-BR"><body style="font-family:Arial,Helvetica,sans-serif;color:#3a2f27;background:#f6f4ef;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6dfd3;border-radius:12px;padding:24px;">
    <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:22px;margin:0 0 12px;">Novo pedido de molde personalizado</h1>
    <p style="margin:0 0 16px;color:#7a6e63;">Nº ${escapeHtml(input.reference)}. Responda este e-mail para falar direto com o cliente.</p>
    <table role="presentation" cellpadding="4" style="font-size:15px;">
      <tr><td style="color:#7a6e63;">Nome</td><td>${escapeHtml(input.name)}</td></tr>
      <tr><td style="color:#7a6e63;">E-mail</td><td>${escapeHtml(input.email)}</td></tr>
      <tr><td style="color:#7a6e63;">WhatsApp</td><td>${escapeHtml(phone)}</td></tr>
      <tr><td style="color:#7a6e63;">Fotos</td><td>${input.photoCount} em anexo</td></tr>
    </table>
    <p style="margin:16px 0 4px;color:#7a6e63;">Descrição</p>
    <p style="margin:0;white-space:pre-wrap;line-height:1.5;">${escapeHtml(input.description)}</p>
  </div>
</body></html>`;
  return { subject, html };
}

function formatPhone(digits: string): string {
  return digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}
