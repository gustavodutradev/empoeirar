import { z } from "zod";
import { onlyDigits } from "@/lib/validation/cpf";

/** Limites do formulário do molde personalizado (mesmos no cliente e no servidor). */
export const CUSTOM_REQUEST_LIMITS = {
  maxPhotos: 3,
  /** Por foto, DEPOIS da compressão no navegador. */
  maxPhotoBytes: 1_000_000,
  maxDescription: 2000,
} as const;

/** Tira quebras de linha e caracteres de controle de texto que vai em cabeçalho/assunto. */
const singleLine = (s: string) =>
  s
    .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const customRequestSchema = z.object({
  name: z
    .string()
    .transform(singleLine)
    .pipe(z.string().min(2, "Informe seu nome.").max(80, "Nome muito longo.")),
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.").max(120)),
  phone: z
    .string()
    .transform(onlyDigits)
    .pipe(z.string().regex(/^(\d{10,11})?$/, "Telefone com DDD, só números (ou deixe em branco).")),
  description: z
    .string()
    .trim()
    .min(10, "Conte um pouco mais sobre o molde que você quer.")
    .max(CUSTOM_REQUEST_LIMITS.maxDescription, "Descrição muito longa."),
  /** Honeypot: campo escondido. Gente não preenche; robô preenche. */
  website: z.string().max(0),
});

export type CustomRequest = z.infer<typeof customRequestSchema>;
