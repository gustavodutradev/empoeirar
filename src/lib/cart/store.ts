"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

/**
 * Storage SSR-safe: usa localStorage no cliente e um fallback em memoria no
 * servidor (onde localStorage nao existe), para nao quebrar no SSR.
 */
const memoryFallback = new Map<string, string>();
const clientStorage: StateStorage = {
  getItem: (name) =>
    typeof window !== "undefined"
      ? window.localStorage.getItem(name)
      : (memoryFallback.get(name) ?? null),
  setItem: (name, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, value);
    else memoryFallback.set(name, value);
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
    else memoryFallback.delete(name);
  },
};

/**
 * Carrinho no cliente, persistido no localStorage (chave "empoeirar-cart").
 * Cada linha e uma VARIANTE (o SKU): mesma variante soma quantidade.
 * Logado, o CartSync espelha o carrinho no banco.
 */
export type CartItem = {
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  /** Preços só para exibir: o pedido é sempre recalculado no banco. */
  pixPriceCents: number;
  cardPriceCents: number;
  image?: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  // Dono do carrinho local. null = convidado. Serve para o CartSync não fundir
  // o carrinho de um usuário no de outro no mesmo navegador (anti-contaminação).
  ownerId: string | null;
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  // Substitui o carrinho pelo estado vindo do servidor (usado no login/sync).
  hydrateFromServer: (items: CartItem[], ownerId: string) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      ownerId: null,
      addItem: (item, quantity) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity: Math.max(1, quantity) } : i,
          ),
        })),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
      hydrateFromServer: (items, ownerId) => set({ items, ownerId }),
    }),
    {
      name: "empoeirar-cart",
      // v2: preço único -> preço no Pix e no cartão. Itens antigos ficam com o
      // mesmo valor nos dois até a próxima sincronização com o banco.
      version: 2,
      migrate: (persisted, version) => migrateCart(persisted, version),
      storage: createJSONStorage(() => clientStorage),
    },
  ),
);

export const selectCount = (s: CartState) => s.items.reduce((n, i) => n + i.quantity, 0);

/**
 * Carrinho salvo por uma versão anterior do site. v1 tinha só `priceCents`.
 * Exportada para teste.
 */
export function migrateCart(
  persisted: unknown,
  version: number,
): Pick<CartState, "items" | "ownerId"> {
  const state = (persisted ?? {}) as { items?: unknown[]; ownerId?: string | null };
  const items = Array.isArray(state.items) ? state.items : [];
  if (version >= 2) return { items: items as CartItem[], ownerId: state.ownerId ?? null };
  return {
    ownerId: state.ownerId ?? null,
    items: items.map((raw) => {
      const { priceCents, ...rest } = raw as CartItem & { priceCents?: number };
      const price = typeof priceCents === "number" ? priceCents : 0;
      return { ...rest, pixPriceCents: price, cardPriceCents: price };
    }),
  };
}

/**
 * Evita mismatch de hidratacao: o servidor renderiza sem localStorage, entao
 * o primeiro render do cliente tambem finge "vazio" ate montar. So depois
 * mostramos o estado real do carrinho.
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
