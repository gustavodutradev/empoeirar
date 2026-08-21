"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectTotalCents, useCart, useHasHydrated } from "@/lib/cart/store";
import { createOrder } from "@/lib/checkout/actions";
import { checkoutFormSchema } from "@/lib/checkout/schema";
import { formatBRL } from "@/lib/format";

type Prefill = { full_name: string; phone: string; cpf: string; email: string };

type FieldName =
  | "full_name"
  | "cpf"
  | "phone"
  | "email"
  | "cep"
  | "street"
  | "number"
  | "complement"
  | "district"
  | "city"
  | "state";

const EMPTY: Record<FieldName, string> = {
  full_name: "",
  cpf: "",
  phone: "",
  email: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

export function CheckoutForm({ prefill }: { prefill: Prefill }) {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const items = useCart((s) => s.items);
  const total = useCart(selectTotalCents);
  const clear = useCart((s) => s.clear);

  const [form, setForm] = useState<Record<FieldName, string>>({
    ...EMPTY,
    full_name: prefill.full_name,
    phone: prefill.phone,
    cpf: prefill.cpf,
    email: prefill.email,
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set(field: FieldName, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function lookupCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`/api/cep/${cep}`);
      if (res.ok) {
        const data = (await res.json()) as {
          street?: string;
          district?: string;
          city?: string;
          state?: string;
        };
        setForm((f) => ({
          ...f,
          street: data.street || f.street,
          district: data.district || f.district,
          city: data.city || f.city,
          state: data.state || f.state,
        }));
      }
    } catch {
      // Silencioso: se a busca falhar, o cliente preenche a mão.
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setGeneralError(null);
    setErrors({});

    const result = checkoutFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const mapped: Partial<Record<FieldName, string>> = {};
      for (const [key, msgs] of Object.entries(fieldErrors)) {
        if (msgs && msgs.length > 0) mapped[key as FieldName] = msgs[0];
      }
      setErrors(mapped);
      return;
    }

    const v = result.data;
    setSubmitting(true);
    const res = await createOrder({
      customer: { full_name: v.full_name, cpf: v.cpf, phone: v.phone, email: v.email },
      address: {
        cep: v.cep,
        street: v.street,
        number: v.number,
        complement: v.complement,
        district: v.district,
        city: v.city,
        state: v.state,
      },
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    });
    setSubmitting(false);

    if (!res.ok) {
      setGeneralError(res.error);
      return;
    }

    clear();
    router.push(`/pedido/${res.orderId}`);
  }

  if (!hydrated) {
    return <div className="min-h-40" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">Seu carrinho está vazio.</p>
        <Button asChild size="lg">
          <Link href="/produtos">Ver os produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8 lg:flex-row lg:items-start"
      noValidate
    >
      <div className="flex flex-1 flex-col gap-8">
        {/* Dados pessoais */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-primary">Seus dados</h2>

          <Field label="Nome completo" error={errors.full_name}>
            <Input
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              autoComplete="name"
              aria-invalid={errors.full_name ? true : undefined}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CPF" error={errors.cpf}>
              <Input
                value={form.cpf}
                onChange={(e) => set("cpf", e.target.value)}
                inputMode="numeric"
                placeholder="000.000.000-00"
                aria-invalid={errors.cpf ? true : undefined}
              />
            </Field>
            <Field label="Telefone" error={errors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="(31) 90000-0000"
                aria-invalid={errors.phone ? true : undefined}
              />
            </Field>
          </div>

          <Field label="E-mail" error={errors.email}>
            <Input value={form.email} readOnly disabled autoComplete="email" />
          </Field>
        </section>

        {/* Endereço de entrega */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-primary">Endereço de entrega</h2>

          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Field label={cepLoading ? "CEP (buscando…)" : "CEP"} error={errors.cep}>
              <Input
                value={form.cep}
                onChange={(e) => set("cep", e.target.value)}
                onBlur={lookupCep}
                inputMode="numeric"
                placeholder="00000-000"
                aria-invalid={errors.cep ? true : undefined}
              />
            </Field>
            <Field label="Rua" error={errors.street}>
              <Input
                value={form.street}
                onChange={(e) => set("street", e.target.value)}
                autoComplete="address-line1"
                aria-invalid={errors.street ? true : undefined}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Field label="Número" error={errors.number}>
              <Input
                value={form.number}
                onChange={(e) => set("number", e.target.value)}
                inputMode="numeric"
                aria-invalid={errors.number ? true : undefined}
              />
            </Field>
            <Field label="Complemento (opcional)" error={errors.complement}>
              <Input
                value={form.complement}
                onChange={(e) => set("complement", e.target.value)}
                placeholder="Apto, bloco, referência"
              />
            </Field>
          </div>

          <Field label="Bairro" error={errors.district}>
            <Input
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
              aria-invalid={errors.district ? true : undefined}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Cidade" error={errors.city}>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                autoComplete="address-level2"
                aria-invalid={errors.city ? true : undefined}
              />
            </Field>
            <Field label="UF" error={errors.state}>
              <Input
                value={form.state}
                onChange={(e) => set("state", e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="MG"
                aria-invalid={errors.state ? true : undefined}
              />
            </Field>
          </div>
        </section>
      </div>

      {/* Resumo */}
      <aside className="w-full shrink-0 rounded-xl border bg-card p-6 lg:w-80">
        <h2 className="font-display text-xl text-primary">Resumo</h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.variantId} className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {item.quantity}× {item.productName}
                <span className="block text-xs">{item.variantLabel}</span>
              </span>
              <span className="tabular-nums">{formatBRL(item.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t pt-4 text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">{formatBRL(total)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Frete</span>
          <span className="text-muted-foreground">a calcular</span>
        </div>

        {generalError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {generalError}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
          {submitting ? "Criando pedido…" : "Criar pedido"}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          O pagamento e o frete entram na próxima etapa.
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    // O input real vem via {children} dentro do <label> (associacao implicita e
    // valida); o Biome so nao enxerga isso atraves da prop children.
    // biome-ignore lint/a11y/noLabelWithoutControl: input renderizado como children
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
