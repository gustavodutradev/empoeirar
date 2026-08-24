"use server";

import { createOrderInputSchema } from "@/lib/checkout/schema";
import { createClient } from "@/lib/supabase/server";

type CreateOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

/**
 * Server Action: cria o pedido. Fronteira de confianca do checkout.
 *
 * Camadas de defesa (todas no servidor):
 *  1. getUser() — precisa estar logado (a identidade vem do cookie, nao do form).
 *  2. Zod — revalida TODO o input (mesmo schema do cliente); nada entra cru.
 *  3. email vem de user.email (a identidade autenticada), NAO do que o cliente
 *     mandou — o campo do form e so exibicao.
 *  4. rpc create_order — recalcula precos do banco e insere atomico. O cliente
 *     manda so {variantId, quantity}; preco nunca trafega daqui.
 * Erros voltam genericos pro cliente (sem detalhe interno); o real fica no log.
 */
export async function createOrder(input: unknown): Promise<CreateOrderResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false, error: "Você precisa estar logado para finalizar." };
  }

  const parsed = createOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { customer, address, items } = parsed.data;

  const { data, error } = await supabase.rpc("create_order", {
    p_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_customer: {
      full_name: customer.full_name,
      cpf: customer.cpf,
      phone: customer.phone,
      email: user.email, // identidade autenticada, nao o campo do cliente
    },
    p_shipping: {
      cep: address.cep,
      street: address.street,
      number: address.number,
      complement: address.complement ?? "",
      district: address.district,
      city: address.city,
      state: address.state,
    },
  });

  if (error || typeof data !== "string") {
    console.error("[create_order] falhou:", error?.message ?? "retorno inesperado");
    return { ok: false, error: "Não foi possível criar o pedido. Tente novamente." };
  }

  return { ok: true, orderId: data };
}
