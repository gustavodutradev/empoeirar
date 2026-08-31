import { z } from "zod";

/**
 * Schemas de edição de produto (admin). Validados no cliente (UX) e de novo no
 * server action antes de tocar o banco.
 */

const nullableInt = z.number().int().min(0).nullable();

export const variantInputSchema = z.object({
  // Sem id = variante nova (insert); com id = variante existente (update).
  id: z.uuid().optional(),
  label: z.string().trim().min(1, "Informe o rótulo.").max(60),
  price_cents: z.number().int().min(0),
  weight_grams: nullableInt,
  length_mm: nullableInt,
  width_mm: nullableInt,
  height_mm: nullableInt,
  sort_order: z.number().int().min(0),
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
