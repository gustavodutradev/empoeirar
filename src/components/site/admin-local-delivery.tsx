"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  type ActionState,
  addLocalDeliveryDistrict,
  removeLocalDeliveryDistrict,
  saveLocalDeliveryConfig,
} from "@/lib/admin/local-delivery-actions";

const FIELD =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={`text-sm ${state.ok ? "text-muted-foreground" : "text-destructive"}`}
    >
      {state.message}
    </p>
  );
}

export function LocalDeliveryConfigForm({
  enabled,
  priceCents,
  deliveryDays,
}: {
  enabled: boolean;
  priceCents: number;
  deliveryDays: number;
}) {
  const [state, action, pending] = useActionState(saveLocalDeliveryConfig, null);
  return (
    <form action={action} className="mt-3 flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={enabled}
          className="size-4 accent-primary"
        />
        Oferecer entrega local no checkout
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Valor (R$)
          <input
            name="price"
            inputMode="decimal"
            defaultValue={(priceCents / 100).toFixed(2).replace(".", ",")}
            className={`${FIELD} w-28`}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Prazo de entrega (dias úteis)
          <input
            name="deliveryDays"
            type="number"
            min={0}
            max={30}
            defaultValue={deliveryDays}
            className={`${FIELD} w-28`}
            required
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function AddDistrictForm() {
  const [state, action, pending] = useActionState(addLocalDeliveryDistrict, null);
  return (
    <form action={action} className="mt-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Novo bairro
          <input name="name" maxLength={80} required className={`${FIELD} w-64`} />
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function RemoveDistrictButton({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(removeLocalDeliveryDistrict, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Remover ${name}`}
        title={state && !state.ok ? state.message : `Remover ${name}`}
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-50"
      >
        ×
      </button>
    </form>
  );
}
