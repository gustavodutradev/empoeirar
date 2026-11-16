"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { reportError } from "@/lib/monitoring/report";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { quoteLocalDelivery } from "@/lib/shipping/local-delivery-server";
import type { FreightOption } from "@/lib/shipping/melhor-envio";
import { isMelhorEnvioConfigured } from "@/lib/shipping/melhor-envio";
import { quoteFreight } from "@/lib/shipping/quote";
import { createAdminClient } from "@/lib/supabase/admin";
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
 *
 * A entrega local em BH (quando o CEP atende) vem primeiro e nao depende do
 * Melhor Envio: se ele estiver fora do ar ou sem token, ela continua aparecendo.
 */
export async function getFreightOptions(input: unknown): Promise<FreightResult> {
  // Rate limit por IP: cada cotação chama ViaCEP e Melhor Envio. Limita
  // abuso/scraping do cálculo de frete sem atrapalhar o checkout normal.
  const ip = clientIp(await headers());
  if (!(await allowRequest(createAdminClient(), `freight:${ip}`, 40, 60))) {
    return { ok: false, error: "Muitas consultas de frete. Aguarde um instante." };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const cep = onlyDigits(parsed.data.toCep);
  if (cep.length !== 8) return { ok: false, error: "CEP inválido." };

  const meConfigured = isMelhorEnvioConfigured();
  const [local, carriers] = await Promise.all([
    quoteLocalDelivery(cep).catch(async (err) => {
      await reportError("getFreightOptions: entrega local", err);
      return null;
    }),
    meConfigured
      ? quoteFreight(cep, parsed.data.items).then(
          (options) => ({ ok: true as const, options }),
          async (err) => {
            await reportError("getFreightOptions", err);
            return { ok: false as const, options: [] as FreightOption[] };
          },
        )
      : Promise.resolve({ ok: true as const, options: [] as FreightOption[] }),
  ]);

  const options = [...(local ? [local] : []), ...carriers.options];
  if (options.length > 0) return { ok: true, options };

  if (!meConfigured) {
    return { ok: false, unconfigured: true, error: "Cálculo de frete indisponível no momento." };
  }
  if (!carriers.ok) return { ok: false, error: "Não foi possível calcular o frete agora." };
  return { ok: false, error: "Nenhuma opção de frete para este CEP." };
}
