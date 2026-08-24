"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveProduct } from "@/lib/admin/product-actions";

type Product = {
  id: string;
  name: string;
  description: string | null;
  material_care: string | null;
  status: string;
  category_id: string;
};
type Variant = {
  id: string;
  label: string;
  price_cents: number;
  weight_grams: number | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  sort_order: number;
};
type Category = { id: string; name: string };

type Row = {
  id?: string;
  label: string;
  price: string; // em reais, string de input
  weight: string; // gramas
  length: string; // mm
  width: string; // mm
  height: string; // mm
};

function intOrNull(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Math.round(Number(t.replace(",", ".")));
  return Number.isFinite(n) ? n : null;
}

function toRow(v: Variant): Row {
  return {
    id: v.id,
    label: v.label,
    price: (v.price_cents / 100).toFixed(2),
    weight: v.weight_grams?.toString() ?? "",
    length: v.length_mm?.toString() ?? "",
    width: v.width_mm?.toString() ?? "",
    height: v.height_mm?.toString() ?? "",
  };
}

export function AdminProductForm({
  product,
  variants,
  categories,
}: {
  product: Product;
  variants: Variant[];
  categories: Category[];
}) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [care, setCare] = useState(product.material_care ?? "");
  const [status, setStatus] = useState(product.status);
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [rows, setRows] = useState<Row[]>(variants.map(toRow));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [
      ...rs,
      { label: "", price: "0.00", weight: "", length: "", width: "", height: "" },
    ]);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await saveProduct({
      id: product.id,
      name: name.trim(),
      description: description.trim() || null,
      material_care: care.trim() || null,
      status,
      category_id: categoryId,
      variants: rows.map((r, i) => ({
        id: r.id,
        label: r.label.trim(),
        price_cents: Math.round(Number(r.price.replace(",", ".") || "0") * 100) || 0,
        weight_grams: intOrNull(r.weight),
        length_mm: intOrNull(r.length),
        width_mm: intOrNull(r.width),
        height_mm: intOrNull(r.height),
        sort_order: i,
      })),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ ok: true, text: "Alterações salvas." });
      router.refresh();
    } else {
      setMessage({ ok: false, text: res.error });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Campos do produto */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <h2 className="font-display text-lg text-primary">Dados do produto</h2>

        {/* biome-ignore lint/a11y/noLabelWithoutControl: input via children */}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Nome</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Categoria</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Descrição</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Material e cuidados</span>
          <textarea
            value={care}
            onChange={(e) => setCare(e.target.value)}
            rows={2}
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </label>
      </section>

      {/* Variantes */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-primary">Variantes</h2>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            + Adicionar variante
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Preço em reais, peso em gramas, dimensões em milímetros. O peso alimenta o cálculo de
          frete — preencha para o frete ficar preciso.
        </p>

        <div className="flex flex-col gap-4">
          {rows.map((row, i) => (
            <div
              key={row.id ?? `novo-${i}`}
              className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr]"
            >
              <LabeledInput
                label="Rótulo"
                value={row.label}
                onChange={(v) => setRow(i, { label: v })}
              />
              <LabeledInput
                label="Preço R$"
                value={row.price}
                onChange={(v) => setRow(i, { price: v })}
                inputMode="decimal"
              />
              <LabeledInput
                label="Peso (g)"
                value={row.weight}
                onChange={(v) => setRow(i, { weight: v })}
                inputMode="numeric"
              />
              <LabeledInput
                label="Compr. (mm)"
                value={row.length}
                onChange={(v) => setRow(i, { length: v })}
                inputMode="numeric"
              />
              <LabeledInput
                label="Larg. (mm)"
                value={row.width}
                onChange={(v) => setRow(i, { width: v })}
                inputMode="numeric"
              />
              <LabeledInput
                label="Alt. (mm)"
                value={row.height}
                onChange={(v) => setRow(i, { height: v })}
                inputMode="numeric"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button type="button" size="lg" onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
        {message ? (
          <span className={message.ok ? "text-sm text-primary" : "text-sm text-destructive"}>
            {message.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: input via children
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className="h-9"
      />
    </label>
  );
}
