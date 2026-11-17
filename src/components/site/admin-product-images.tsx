"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteProductImage, setPrimaryImage, uploadProductImage } from "@/lib/admin/image-actions";
import { compressImage as compress } from "@/lib/images/compress";

type Img = { id: string; url: string; isPrimary: boolean };

export function AdminProductImages({ productId, images }: { productId: string; images: Img[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = ""; // permite re-selecionar o mesmo arquivo
    if (!file) return;

    setBusy(true);
    setError(null);
    const compressed = await compress(file);
    const fd = new FormData();
    fd.append("productId", productId);
    fd.append("file", compressed);
    const res = await uploadProductImage(fd);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  async function onSetPrimary(id: string) {
    setBusy(true);
    setError(null);
    const res = await setPrimaryImage(id);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  async function onDelete(id: string) {
    setBusy(true);
    setError(null);
    const res = await deleteProductImage(id);
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-lg text-primary">Fotos</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Enviando…" : "+ Adicionar foto"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onPick}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        PNG, JPG ou WEBP. A imagem é otimizada automaticamente. A “capa” é a que aparece nas
        listagens.
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="flex flex-col gap-2">
              <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                {/* biome-ignore lint/performance/noImgElement: mesma ponte das fotos de produto (Storage) */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                {img.isPrimary ? (
                  <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                    Capa
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {!img.isPrimary ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSetPrimary(img.id)}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    Definir capa
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDelete(img.id)}
                  className="text-xs text-destructive hover:underline disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
