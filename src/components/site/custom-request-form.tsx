"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitCustomRequest } from "@/lib/custom-request/actions";
import { CUSTOM_REQUEST_LIMITS } from "@/lib/custom-request/schema";
import { compressImage } from "@/lib/images/compress";

type Photo = { file: File; preview: string };

/**
 * Formulário do molde personalizado. As fotos são comprimidas aqui (1280px,
 * WebP) antes de enviar; o servidor confere tipo e tamanho de novo.
 * Ao final, mostra o botão que abre o WhatsApp do ateliê com a mensagem pronta.
 */
export function CustomRequestForm() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; whatsappUrl: string } | null>(null);

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError(null);
    const room = CUSTOM_REQUEST_LIMITS.maxPhotos - photos.length;
    if (picked.length > room) {
      setError(`Envie no máximo ${CUSTOM_REQUEST_LIMITS.maxPhotos} fotos.`);
    }
    const next: Photo[] = [];
    for (const file of picked.slice(0, Math.max(0, room))) {
      const small = await compressImage(file, { maxSide: 1280, quality: 0.8 });
      if (small.size > CUSTOM_REQUEST_LIMITS.maxPhotoBytes) {
        setError("Uma das fotos ficou grande demais. Tente outra foto.");
        continue;
      }
      next.push({ file: small, preview: URL.createObjectURL(small) });
    }
    setPhotos((current) => [...current, ...next]);
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const photo = current[index];
      if (photo) URL.revokeObjectURL(photo.preview);
      return current.filter((_, i) => i !== index);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    data.delete("photos");
    for (const photo of photos) data.append("photos", photo.file);
    const res = await submitCustomRequest(data);
    setSending(false);
    if (res.ok) {
      for (const photo of photos) URL.revokeObjectURL(photo.preview);
      setPhotos([]);
      setDone({ reference: res.reference, whatsappUrl: res.whatsappUrl });
    } else {
      setError(res.error);
    }
  }

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl border bg-card p-6">
        <h2 className="font-display text-2xl text-primary">Pedido enviado!</h2>
        <p className="text-foreground/85">
          Recebemos seu pedido nº <strong>{done.reference}</strong> com as fotos. Para agilizar,
          continue a conversa com a gente pelo WhatsApp: a mensagem já vai escrita.
        </p>
        <Button asChild size="lg" className="w-fit">
          <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer">
            Continuar no WhatsApp
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor="cr-name" className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Nome</span>
          <Input
            id="cr-name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
          />
        </label>
        <label htmlFor="cr-email" className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">E-mail</span>
          <Input
            id="cr-email"
            name="email"
            type="email"
            required
            maxLength={120}
            autoComplete="email"
          />
        </label>
        <label htmlFor="cr-phone" className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">WhatsApp com DDD (opcional)</span>
          <Input
            id="cr-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            maxLength={20}
            autoComplete="tel"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Como é o molde que você quer?</span>
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={CUSTOM_REQUEST_LIMITS.maxDescription}
          rows={6}
          placeholder="Formato, medidas aproximadas, para que peça é, quantas unidades…"
          className="rounded-md border bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium">
          Fotos ou desenhos de referência (até {CUSTOM_REQUEST_LIMITS.maxPhotos})
        </span>
        {photos.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {photos.map((photo, i) => (
              <li key={photo.preview} className="relative">
                {/* biome-ignore lint/performance/noImgElement: prévia local (blob:), sem otimização */}
                <img
                  src={photo.preview}
                  alt={`Foto ${i + 1}`}
                  className="size-24 rounded-md border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Remover foto ${i + 1}`}
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border bg-background text-sm hover:text-destructive"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {photos.length < CUSTOM_REQUEST_LIMITS.maxPhotos ? (
          <input
            type="file"
            name="photos"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onPickPhotos}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-2 file:text-sm"
          />
        ) : null}
      </div>

      {/* Honeypot: escondido de pessoas e de leitores de tela. Robôs preenchem. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Usamos seus dados só para responder este pedido, como descrito na{" "}
        <a href="/privacidade" className="underline">
          política de privacidade
        </a>
        .
      </p>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-fit" disabled={sending}>
        {sending ? "Enviando…" : "Enviar pedido"}
      </Button>
    </form>
  );
}
