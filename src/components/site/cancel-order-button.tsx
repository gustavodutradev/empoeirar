"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelMyOrder } from "@/lib/checkout/cancel-actions";

/**
 * "Cancelar pedido" em duas etapas (clicar e depois confirmar), sem
 * window.confirm: o diálogo nativo bloqueia a página e destoa do site.
 * Toda a validação (dono, status, pagamento em andamento) é no servidor.
 */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setMessage(null);
    const res = await cancelMyOrder(orderId);
    setLoading(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    setConfirming(false);
    setMessage(res.error);
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      {confirming ? (
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <span className="text-sm text-muted-foreground">Cancelar este pedido?</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? "Cancelando…" : "Sim, cancelar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setConfirming(true)}
        >
          Cancelar pedido
        </Button>
      )}
      {message ? (
        <p role="alert" className="max-w-md text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
