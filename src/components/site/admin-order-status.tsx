"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminAdvanceOrder } from "@/lib/admin/actions";
import { isOrderStatus, ORDER_STATUS, statusLabel } from "@/lib/checkout/status";
import { ADMIN_TRANSITIONS, isBackwardMove } from "@/lib/checkout/transitions";

/**
 * Controle de status do pedido (admin). Mostra só as mudanças permitidas a
 * partir do status atual (ADMIN_TRANSITIONS). Isso é conforto de UI: o server
 * action valida de novo, a partir do status lido no banco.
 */
export function AdminOrderStatus({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const options = isOrderStatus(currentStatus) ? ADMIN_TRANSITIONS[currentStatus] : [];
  const [status, setStatus] = useState<string>(options[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (options.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        {currentStatus === "pending_payment"
          ? "Aguardando pagamento: o status muda sozinho quando o Mercado Pago confirmar."
          : `Pedido ${statusLabel(currentStatus).toLowerCase()}: o status não pode ser alterado aqui.`}
      </div>
    );
  }

  async function save() {
    if (status === "cancelled" && !window.confirm(CANCEL_CONFIRM)) return;
    setSaving(true);
    setMessage(null);
    const res = await adminAdvanceOrder(orderId, status);
    setSaving(false);
    if (res.ok) {
      setMessage("Status atualizado.");
      router.refresh();
    } else {
      setMessage(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <span className="text-sm font-medium">Mudar status</span>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {options.map((value) => (
            <option key={value} value={value}>
              {isOrderStatus(currentStatus) && isBackwardMove(currentStatus, value)
                ? `Voltar para: ${ORDER_STATUS[value].label}`
                : ORDER_STATUS[value].label}
            </option>
          ))}
        </select>
        <Button type="button" onClick={save} disabled={saving || !status}>
          {saving ? "Salvando…" : "Atualizar"}
        </Button>
      </div>
      {status === "cancelled" ? (
        <p className="text-sm text-destructive">
          Cancelar não devolve o dinheiro. Se o pedido já foi pago, faça o estorno no painel do
          Mercado Pago.
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

const CANCEL_CONFIRM =
  "Cancelar este pedido? O cliente vê o pedido como cancelado. O estorno do pagamento é feito à parte, no painel do Mercado Pago.";
