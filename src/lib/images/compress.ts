/**
 * Comprime/redimensiona a imagem NO NAVEGADOR antes de enviar: no máximo
 * `maxSide` px no lado maior, re-encodada em WebP. Deixa o arquivo pequeno e
 * evita o limite de body do server action. Se algo falhar, devolve o original
 * (o servidor ainda confere tipo e tamanho).
 */
export async function compressImage(
  file: File,
  { maxSide = 1600, quality = 0.85 }: { maxSide?: number; quality?: number } = {},
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
    if (!blob) return file;
    return new File([blob], "foto.webp", { type: "image/webp" });
  } catch {
    return file;
  }
}
