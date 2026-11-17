"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminSetTrackingCode } from "@/lib/admin/actions";
import { trackingUrl } from "@/lib/shipping/tracking";

/**
 * Campo do código de rastreio no detalhe do pedido (admin). Preencher ANTES de
 * marcar "Enviado" faz o link ir junto no e-mail para o cliente.
 */
export function AdminOrderTracking({
  orderId,
  currentCode,
}: {
  orderId: string;
  currentCode: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(currentCode ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await adminSetTrackingCode(orderId, code);
    setSaving(false);
    if (res.ok) {
      setMessage(code.trim() ? "Código salvo." : "Código removido.");
      router.refresh();
    } else {
      setMessage(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <span className="text-sm font-medium">Código de rastreio</span>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={60}
          placeholder="Ex.: AA123456789BR"
          aria-label="Código de rastreio"
          className="h-10 w-64 rounded-md border bg-background px-3 text-sm uppercase outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="button" variant="secondary" onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        {currentCode ? (
          <a
            href={trackingUrl(currentCode)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Ver no Melhor Rastreio ↗
          </a>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Salve o código antes de marcar como “Enviado”: assim o link vai junto no e-mail para o
        cliente. Entrega local não precisa de código.
      </p>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
