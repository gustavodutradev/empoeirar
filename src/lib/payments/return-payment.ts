import "server-only";
import { reportError } from "@/lib/monitoring/report";
import { getPayment, isMercadoPagoConfigured } from "./mercadopago";
import { parsePaymentId, type VerifiedPayment } from "./return-notice";

/**
 * Pagamento informado na URL de retorno do Mercado Pago, CONFERIDO na API.
 *
 * A URL de retorno é editável por qualquer um (`?status=approved` não prova
 * nada). Por isso o status nunca é lido da URL: só o id do pagamento, que é
 * consultado no MP, e o resultado só vale se o pagamento for DESTE pedido
 * (external_reference). Sem isso, um link com o id de outro pagamento
 * mostraria informação de outra compra.
 *
 * Serve só para a mensagem na tela. Quem muda o status do pedido continua
 * sendo o webhook.
 */
export async function getVerifiedReturnPayment(
  orderId: string,
  rawPaymentId: unknown,
): Promise<VerifiedPayment | null> {
  const paymentId = parsePaymentId(rawPaymentId);
  if (!paymentId || !isMercadoPagoConfigured()) return null;

  try {
    const payment = await getPayment(paymentId);
    if (!payment || payment.externalReference !== orderId) return null;
    return { status: payment.status, statusDetail: payment.statusDetail };
  } catch (err) {
    await reportError("retorno do MP: getPayment", err, { pedido: orderId });
    return null;
  }
}
