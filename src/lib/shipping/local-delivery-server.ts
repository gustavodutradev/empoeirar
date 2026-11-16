import "server-only";
import { createClient } from "@/lib/supabase/server";
import { lookupCep } from "./cep";
import { isLocalDeliveryAddress, localDeliveryOption } from "./local-delivery";
import type { FreightOption } from "./melhor-envio";

/**
 * Opção de entrega local para o CEP, ou null se não atende.
 *
 * Tudo vem de fontes do servidor: bairro da ViaCEP, tarifa e bairros do banco.
 * Usada para MOSTRAR a opção (getFreightOptions) e para CONFIRMAR o preço na
 * criação do pedido (createOrder), com a mesma regra.
 *
 * Na dúvida (ViaCEP fora do ar, erro no banco), não oferece a entrega local:
 * o cliente ainda tem as transportadoras.
 */
export async function quoteLocalDelivery(cep: string): Promise<FreightOption | null> {
  const supabase = await createClient();
  const [lookup, { data: config }, { data: districts }] = await Promise.all([
    lookupCep(cep),
    supabase
      .from("local_delivery_config")
      .select("enabled, price_cents, delivery_days")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("local_delivery_district").select("name"),
  ]);

  if (!lookup.ok || !config?.enabled || !districts) return null;
  if (
    !isLocalDeliveryAddress(
      lookup.address,
      districts.map((d) => d.name as string),
    )
  )
    return null;

  return localDeliveryOption({
    enabled: true,
    priceCents: config.price_cents,
    deliveryDays: config.delivery_days,
  });
}
