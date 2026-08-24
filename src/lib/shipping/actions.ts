"use server";

import { z } from "zod";
import type { FreightOption } from "@/lib/shipping/melhor-envio";
import { isMelhorEnvioConfigured } from "@/lib/shipping/melhor-envio";
import { quoteFreight } from "@/lib/shipping/quote";
import { onlyDigits } from "@/lib/validation/cpf";

const inputSchema = z.object({
  toCep: z.string(),
  items: z
    .array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(99) }))
    .min(1),
});

type FreightResult =
  | { ok: true; options: FreightOption[] }
  | { ok: false; error: string; unconfigured?: boolean };

/**
 * Retorna as opcoes de frete para o CEP + carrinho. Chamada pelo checkout
 * quando o cliente preenche o CEP. Os itens carregam so {variantId, quantity};
 * dimensoes e preco saem do banco (em quoteFreight).
 */
export async function getFreightOptions(input: unknown): Promise<FreightResult> {
  if (!isMelhorEnvioConfigured()) {
    return { ok: false, unconfigured: true, error: "Cálculo de frete indisponível no momento." };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const cep = onlyDigits(parsed.data.toCep);
  if (cep.length !== 8) return { ok: false, error: "CEP inválido." };

  try {
    const options = await quoteFreight(cep, parsed.data.items);
    if (options.length === 0) {
      return { ok: false, error: "Nenhuma opção de frete para este CEP." };
    }
    return { ok: true, options };
  } catch (err) {
    console.error("[getFreightOptions]", err instanceof Error ? err.message : err);
    return { ok: false, error: "Não foi possível calcular o frete agora." };
  }
}
