/**
 * Mensagem mostrada quando o cliente volta do Mercado Pago para a página do
 * pedido (item 48). Função PURA: recebe o pagamento JÁ VERIFICADO no servidor
 * (consultado na API do MP, nunca lido da URL) e devolve o texto.
 *
 * Só é usada com o pedido ainda "aguardando pagamento": se o webhook já
 * confirmou, o título da página já diz "Pagamento confirmado!".
 */

export type ReturnNotice = {
  tone: "success" | "info" | "warning";
  title: string;
  text: string;
  /**
   * true quando já existe pagamento aprovado ou em análise: a página esconde
   * "Pagar" e "Cancelar" para o cliente não pagar duas vezes enquanto o
   * webhook não chega.
   */
  hidePaymentActions: boolean;
};

export type VerifiedPayment = { status: string; statusDetail: string | null };

/**
 * Motivos de recusa do cartão (status_detail do MP) que o cliente consegue
 * resolver sozinho. Recusas por análise de risco ficam com texto genérico de
 * propósito: explicar o motivo ajudaria quem tenta fraudar, não o cliente.
 */
const REJECTION_HINTS: Record<string, string> = {
  cc_rejected_insufficient_amount: "O cartão não tem limite suficiente para este valor.",
  cc_rejected_bad_filled_card_number: "O número do cartão foi digitado errado.",
  cc_rejected_bad_filled_date: "A data de validade do cartão foi digitada errada.",
  cc_rejected_bad_filled_security_code: "O código de segurança do cartão foi digitado errado.",
  cc_rejected_bad_filled_other: "Algum dado do cartão foi digitado errado.",
  cc_rejected_call_for_authorize:
    "O banco do cartão pediu uma autorização. Fale com o seu banco e tente de novo.",
  cc_rejected_card_disabled: "O cartão não está ativo. Fale com o seu banco ou use outro cartão.",
  cc_rejected_max_attempts: "O limite de tentativas com este cartão foi atingido.",
  cc_rejected_duplicated_payment:
    "Já existe um pagamento com este mesmo valor. Confira se ele foi aprovado antes de tentar de novo.",
};

/** Sem pagamento verificado, ou status desconhecido: vale para qualquer caso. */
const NEUTRAL: ReturnNotice = {
  tone: "info",
  hidePaymentActions: false,
  title: "Você voltou do Mercado Pago",
  text: "Se você concluiu o pagamento, o status abaixo é atualizado assim que ele for confirmado.",
};

const PENDING_OFFLINE = new Set(["pending_waiting_payment", "pending_waiting_transfer"]);

export function buildReturnNotice(
  payment: VerifiedPayment | null,
  opts: { canPay: boolean },
): ReturnNotice {
  const retry = opts.canPay
    ? "Seu pedido continua aberto: você pode tentar de novo com outro cartão ou com Pix."
    : "O prazo para pagar este pedido terminou; faça um novo pedido pela loja.";

  // Sem pagamento verificado (o cliente voltou sem pagar, ou não deu para
  // consultar o MP): mensagem neutra, que vale para qualquer caso.
  if (!payment) {
    return NEUTRAL;
  }

  switch (payment.status) {
    case "approved":
      return {
        tone: "success",
        hidePaymentActions: true,
        title: "Pagamento aprovado!",
        text: "Estamos registrando a confirmação. Em instantes o status abaixo é atualizado e você recebe um e-mail.",
      };

    case "pending":
    case "authorized":
      if (payment.statusDetail && PENDING_OFFLINE.has(payment.statusDetail)) {
        return {
          tone: "info",
          hidePaymentActions: false,
          title: "Falta pagar o Pix ou o boleto",
          text: "Assim que o pagamento for compensado, o pedido é confirmado automaticamente. Boleto pode levar até 3 dias úteis.",
        };
      }
      return {
        tone: "info",
        hidePaymentActions: false,
        title: "Pagamento pendente",
        text: "Assim que ele for confirmado, o status abaixo é atualizado e você recebe um e-mail.",
      };

    case "in_process":
      return {
        tone: "info",
        hidePaymentActions: true,
        title: "Pagamento em análise",
        text: "O Mercado Pago está analisando o pagamento, o que pode levar até 2 dias úteis. Avisamos por e-mail quando for aprovado; não é preciso pagar de novo.",
      };

    case "rejected": {
      const hint = (payment.statusDetail && REJECTION_HINTS[payment.statusDetail]) ?? "";
      return {
        tone: "warning",
        hidePaymentActions: false,
        title: "Pagamento não aprovado",
        text: [hint || "O pagamento foi recusado.", retry].join(" "),
      };
    }

    case "cancelled":
      return {
        tone: "warning",
        hidePaymentActions: false,
        title: "Pagamento cancelado ou expirado",
        text: `O pagamento não foi concluído. ${retry}`,
      };

    default:
      return NEUTRAL;
  }
}

/**
 * Id de pagamento vindo da URL de retorno (payment_id / collection_id). O MP
 * manda só dígitos; quando o cliente volta sem pagar, manda "null". Qualquer
 * outra coisa é descartada antes de virar parte de uma URL da API do MP.
 */
export function parsePaymentId(value: unknown): string | null {
  return typeof value === "string" && /^\d{1,20}$/.test(value) ? value : null;
}
