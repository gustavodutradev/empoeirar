import { z } from "zod";
import { isValidCpf, onlyDigits } from "@/lib/validation/cpf";

/**
 * Schemas do checkout. Mesma fonte de verdade para o formulario (UX no cliente)
 * E para a server action (validacao real no servidor). Regra do projeto: validar
 * SEMPRE no servidor; o cliente e so conveniencia. Por isso a action reusa
 * exatamente estes schemas antes de tocar o banco.
 *
 * Campos numericos (cpf/telefone/cep) sao normalizados para so-digitos aqui, na
 * borda — o resto do sistema nunca ve mascara.
 */

export const customerSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome completo.").max(120),
  cpf: z.string().transform(onlyDigits).refine(isValidCpf, "CPF inválido."),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 10 && v.length <= 11, "Telefone inválido (DDD + número)."),
  email: z.email("E-mail inválido."),
});

export const addressSchema = z.object({
  cep: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length === 8, "CEP deve ter 8 dígitos."),
  street: z.string().trim().min(2, "Informe a rua.").max(160),
  number: z.string().trim().min(1, "Informe o número.").max(20),
  complement: z.string().trim().max(80).optional().default(""),
  district: z.string().trim().min(2, "Informe o bairro.").max(80),
  city: z.string().trim().min(2, "Informe a cidade.").max(80),
  state: z
    .string()
    .trim()
    .length(2, "UF deve ter 2 letras.")
    .transform((v) => v.toUpperCase()),
});

/**
 * Versao "achatada" (cliente + endereco num objeto so) para o formulario:
 * facilita mapear erro por campo (error.flatten().fieldErrors).
 */
export const checkoutFormSchema = customerSchema.extend(addressSchema.shape);
export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;

/** Uma linha do carrinho enviada ao servidor: SEM preco, so referencia + qtd. */
export const orderItemSchema = z.object({
  variantId: z.uuid("Variante inválida."),
  quantity: z.number().int().min(1).max(99),
});

/** Entrada completa da server action de criar pedido. */
export const createOrderInputSchema = z.object({
  customer: customerSchema,
  address: addressSchema,
  items: z.array(orderItemSchema).min(1, "Carrinho vazio."),
  // ID do serviço de frete escolhido (Melhor Envio). Opcional: se ausente
  // (ME não configurado, ou sem seleção), o pedido nasce com frete a calcular.
  // O PREÇO nunca vem do cliente — só este id; o servidor recalcula.
  shippingServiceId: z.number().int().optional(),
});

export type CustomerInput = z.input<typeof customerSchema>;
export type AddressInput = z.input<typeof addressSchema>;
export type CreateOrderInput = z.input<typeof createOrderInputSchema>;
