import { z } from "zod";

/**
 * Schemas de edição de produto (admin). Validados no cliente (UX) e de novo no
 * server action antes de tocar o banco.
 */

const nullableInt = z.number().int().min(0).nullable();

/** Teto de R$ 100.000 por variante: pega erro de digitação (vírgula/ponto). */
const priceCents = (label: string) =>
  z
    .number(`Valor ${label} inválido.`)
    .int()
    .min(0, `Valor ${label} inválido.`)
    .max(10_000_000, `Valor ${label} alto demais. Confira a vírgula.`);

export const variantInputSchema = z
  .object({
    // Sem id = variante nova (insert); com id = variante existente (update).
    id: z.uuid().optional(),
    label: z.string().trim().min(1, "Informe o rótulo.").max(60),
    price_pix_cents: priceCents("Pix"),
    price_card_cents: priceCents("Cartão"),
    weight_grams: nullableInt,
    length_mm: nullableInt,
    width_mm: nullableInt,
    height_mm: nullableInt,
    sort_order: z.number().int().min(0),
  })
  // A mesma regra existe no banco (product_variant_pix_not_above_card).
  .refine((v) => v.price_pix_cents <= v.price_card_cents, {
    message: "O Valor Pix não pode ser maior que o Valor Cartão.",
    path: ["price_pix_cents"],
  });

export const productInputSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Informe o nome.").max(160),
  description: z.string().max(2000).nullable(),
  material_care: z.string().max(2000).nullable(),
  status: z.enum(["draft", "published", "archived"]),
  category_id: z.uuid("Selecione a categoria."),
  variants: z.array(variantInputSchema).min(1, "O produto precisa de ao menos uma variante."),
});

/** Criação: sem id de produto; slug opcional (vazio = gerado do nome). */
export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(160),
  slug: z.string().trim().max(160).optional(),
  description: z.string().max(2000).nullable(),
  material_care: z.string().max(2000).nullable(),
  status: z.enum(["draft", "published", "archived"]),
  category_id: z.uuid("Selecione a categoria."),
  variants: z.array(variantInputSchema).min(1, "O produto precisa de ao menos uma variante."),
});

export type VariantInput = z.infer<typeof variantInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
