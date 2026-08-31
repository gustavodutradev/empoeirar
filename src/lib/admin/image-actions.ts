"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Ações de foto de produto (admin). Fronteira de confiança:
 *  1. getUser + is_admin() no banco (nunca confia na UI).
 *  2. Upload validado: só imagem (png/jpeg/webp — SVG barrado por causa de XSS),
 *     tamanho limitado, e o CAMINHO no Storage é gerado por nós (uuid), nunca o
 *     nome de arquivo do usuário (anti path traversal).
 *  3. Bytes vão pro Storage via service_role (bypassa a RLS do Storage); a LINHA
 *     em product_image entra pelo client autenticado (policy is_admin).
 *
 * O bucket é o `produtos` (público) — as mesmas fotos que a loja já serve.
 */

const BUCKET = "produtos";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB (as fotos já vêm comprimidas do cliente)
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

type Result = { ok: true } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function uploadProductImage(formData: FormData): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");

  if (!UUID_RE.test(productId)) return { ok: false, error: "Produto inválido." };
  if (!(file instanceof File)) return { ok: false, error: "Arquivo ausente." };
  if (file.size === 0 || file.size > MAX_BYTES) {
    return { ok: false, error: "Imagem vazia ou maior que 5MB." };
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return { ok: false, error: "Formato inválido. Use PNG, JPG ou WEBP." };

  // Caminho gerado por nós — nunca o nome do arquivo do usuário.
  const path = `products/${productId}/${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) {
    console.error("[uploadProductImage] storage:", upErr.message);
    return { ok: false, error: "Falha ao enviar a imagem. Tente novamente." };
  }

  // Primeira foto do produto vira a capa; sort_order no fim da fila.
  const { data: existing } = await supabase
    .from("product_image")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false });
  const isPrimary = (existing?.length ?? 0) === 0;
  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error: rowErr } = await supabase.from("product_image").insert({
    product_id: productId,
    storage_path: path,
    sort_order: nextSort,
    is_primary: isPrimary,
  });

  if (rowErr) {
    // Compensa: remove o objeto órfão do Storage.
    await admin.storage.from(BUCKET).remove([path]);
    console.error("[uploadProductImage] row:", rowErr.message);
    return { ok: false, error: "Falha ao registrar a imagem. Tente novamente." };
  }

  return { ok: true };
}

export async function deleteProductImage(imageId: string): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  const { data: img } = await supabase
    .from("product_image")
    .select("id, product_id, storage_path, is_primary")
    .eq("id", imageId)
    .maybeSingle();
  if (!img) return { ok: false, error: "Imagem não encontrada." };

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([img.storage_path]);

  const { error: delErr } = await supabase.from("product_image").delete().eq("id", imageId);
  if (delErr) {
    console.error("[deleteProductImage]", delErr.message);
    return { ok: false, error: "Não foi possível remover a imagem." };
  }

  // Se removemos a capa, promove a primeira restante a capa.
  if (img.is_primary) {
    const { data: next } = await supabase
      .from("product_image")
      .select("id")
      .eq("product_id", img.product_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.from("product_image").update({ is_primary: true }).eq("id", next.id);
    }
  }

  return { ok: true };
}

export async function setPrimaryImage(imageId: string): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  const { data: img } = await supabase
    .from("product_image")
    .select("id, product_id")
    .eq("id", imageId)
    .maybeSingle();
  if (!img) return { ok: false, error: "Imagem não encontrada." };

  await supabase
    .from("product_image")
    .update({ is_primary: false })
    .eq("product_id", img.product_id);
  const { error } = await supabase
    .from("product_image")
    .update({ is_primary: true })
    .eq("id", imageId);

  if (error) {
    console.error("[setPrimaryImage]", error.message);
    return { ok: false, error: "Não foi possível definir a capa." };
  }
  return { ok: true };
}
