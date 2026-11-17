/**
 * Descobre o tipo da imagem pelos primeiros bytes ("magic numbers"), sem
 * confiar no nome do arquivo nem no content-type que o navegador mandou (os
 * dois são controlados por quem envia).
 */
export type ImageType = "image/jpeg" | "image/png" | "image/webp";

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return "image/png";
  // RIFF....WEBP
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export const IMAGE_EXTENSION: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
