"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminAdvanceOrder } from "@/lib/admin/actions";
import { ORDER_STATUS } from "@/lib/checkout/status";

const OPTIONS = Object.entries(ORDER_STATUS).map(([value, meta]) => ({ value, label: meta.label }));

/**
 * Controle de status do pedido (admin). Chama o server action, que re-checa
 * is_admin no servidor e registra o evento na linha do tempo. Depois do sucesso,
 * router.refresh() recarrega o detalhe (status + timeline atualizados).
 */
export function AdminOrderStatus({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
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
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button type="button" onClick={save} disabled={saving || status === currentStatus}>
          {saving ? "Salvando…" : "Atualizar"}
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
