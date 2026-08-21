"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startPayment } from "@/lib/payments/actions";

/**
 * Botão de pagamento. Chama a server action, que cria a preference no MP e
 * devolve o link do checkout; aqui só redirecionamos. Se o MP ainda não está
 * configurado, a action devolve uma mensagem amigável (sem quebrar).
 */
export function PayButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setMessage(null);
    const res = await startPayment(orderId);
    if (res.ok) {
      window.location.href = res.url;
      return;
    }
    setLoading(false);
    setMessage(res.error);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        size="lg"
        onClick={handlePay}
        disabled={loading}
        className="w-full sm:w-auto"
      >
        {loading ? "Redirecionando…" : "Pagar com Mercado Pago"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
