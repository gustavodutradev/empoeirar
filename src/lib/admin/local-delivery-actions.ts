"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { reportError } from "@/lib/monitoring/report";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string } | null;

/**
 * Edição da entrega local pelo admin. Fronteira (igual às outras ações):
 *  1. getUser + is_admin() no banco.
 *  2. Zod revalida o formulário.
 *  3. Escreve sob RLS (policies *_admin das tabelas local_delivery_*).
 */
async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin ? supabase : null;
}

const configSchema = z.object({
  enabled: z.boolean(),
  // "10,00" ou "10.00" ou "10" -> centavos. Teto de R$ 500 contra erro de digitação.
  price: z
    .string()
    .trim()
    .regex(/^\d{1,3}([.,]\d{1,2})?$/, "Valor inválido. Use, por exemplo, 10,00.")
    .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
    .pipe(z.number().int().min(0).max(50_000)),
  deliveryDays: z.coerce.number().int("Prazo inválido.").min(0).max(30, "Prazo máximo: 30 dias."),
});

export async function saveLocalDeliveryConfig(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const supabase = await requireAdminClient();
  if (!supabase) return { ok: false, message: "Sem permissão." };

  const parsed = configSchema.safeParse({
    enabled: form.get("enabled") === "on",
    price: String(form.get("price") ?? ""),
    deliveryDays: form.get("deliveryDays"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { error } = await supabase
    .from("local_delivery_config")
    .update({
      enabled: parsed.data.enabled,
      price_cents: parsed.data.price,
      delivery_days: parsed.data.deliveryDays,
    })
    .eq("id", 1);

  if (error) {
    await reportError("saveLocalDeliveryConfig", error.message);
    return { ok: false, message: "Não foi possível salvar." };
  }
  revalidatePath("/admin/entrega-local");
  revalidatePath("/politica-envio");
  return { ok: true, message: "Salvo." };
}

const districtSchema = z
  .string()
  .trim()
  .min(2, "Nome muito curto.")
  .max(80, "Nome muito longo.")
  // Letras (com acento), espaço, hífen, apóstrofo e ponto: nomes de bairro reais.
  .regex(/^[\p{L}][\p{L} .'-]*$/u, "Use só letras, espaços e hífen.");

export async function addLocalDeliveryDistrict(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const supabase = await requireAdminClient();
  if (!supabase) return { ok: false, message: "Sem permissão." };

  const parsed = districtSchema.safeParse(String(form.get("name") ?? ""));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  const { error } = await supabase
    .from("local_delivery_district")
    .insert({ name: parsed.data.replace(/\s+/g, " ") });

  if (error) {
    if (error.code === "23505") return { ok: false, message: "Esse bairro já está na lista." };
    await reportError("addLocalDeliveryDistrict", error.message);
    return { ok: false, message: "Não foi possível adicionar." };
  }
  revalidatePath("/admin/entrega-local");
  revalidatePath("/politica-envio");
  return { ok: true, message: `${parsed.data} adicionado.` };
}

export async function removeLocalDeliveryDistrict(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const supabase = await requireAdminClient();
  if (!supabase) return { ok: false, message: "Sem permissão." };

  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: "Bairro inválido." };

  const { error } = await supabase.from("local_delivery_district").delete().eq("id", id.data);
  if (error) {
    await reportError("removeLocalDeliveryDistrict", error.message);
    return { ok: false, message: "Não foi possível remover." };
  }
  revalidatePath("/admin/entrega-local");
  revalidatePath("/politica-envio");
  return { ok: true, message: "Removido." };
}
