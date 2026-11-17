import { describe, expect, it } from "vitest";
import { sniffImageType } from "./sniff";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("sniffImageType", () => {
  it("reconhece JPEG, PNG e WebP pelos bytes", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe(
      "image/png",
    );
    expect(sniffImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 ")))).toBe(
      "image/webp",
    );
  });

  it("recusa outros formatos, mesmo com nome de imagem", () => {
    expect(sniffImageType(bytes(...ascii("%PDF-1.7")))).toBeNull();
    expect(sniffImageType(bytes(...ascii("<svg xmlns")))).toBeNull();
    expect(sniffImageType(bytes(...ascii("MZ"), 0x90, 0))).toBeNull();
    expect(sniffImageType(bytes())).toBeNull();
  });
});
