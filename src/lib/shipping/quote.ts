import "server-only";
import {
  calculateFreight,
  type FreightOption,
  type FreightProduct,
  isMelhorEnvioConfigured,
} from "@/lib/shipping/melhor-envio";
import { createClient } from "@/lib/supabase/server";

export type QuoteItem = { variantId: string; quantity: number };

/**
 * Cota o frete para um destino + itens. Le peso/dimensoes/preco das variantes
 * DIRETO DO BANCO (nunca do cliente) — e a fonte autoritativa tanto para exibir
 * as opcoes quanto para revalidar o preco na hora de criar o pedido.
 *
 * Retorna [] se o Melhor Envio nao estiver configurado (checkout degrada).
 */
export async function quoteFreight(cep: string, items: QuoteItem[]): Promise<FreightOption[]> {
  if (!isMelhorEnvioConfigured() || items.length === 0) return [];

  const supabase = await createClient();
  const ids = items.map((i) => i.variantId);
  const { data: variants } = await supabase
    .from("product_variant")
    .select("id, weight_grams, length_mm, width_mm, height_mm, price_cents")
    .in("id", ids);

  if (!variants || variants.length === 0) return [];

  const byId = new Map(
    (variants as Array<{ id: string } & Record<string, number | null>>).map((v) => [v.id, v]),
  );

  const products: FreightProduct[] = items.map((i) => {
    const v = byId.get(i.variantId);
    return {
      weightGrams: v?.weight_grams ?? null,
      lengthMm: v?.length_mm ?? null,
      widthMm: v?.width_mm ?? null,
      heightMm: v?.height_mm ?? null,
      priceCents: v?.price_cents ?? 0,
      quantity: i.quantity,
    };
  });

  return calculateFreight({ toCep: cep, products });
}
