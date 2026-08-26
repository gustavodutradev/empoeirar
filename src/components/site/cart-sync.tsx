"use client";

import { useEffect, useRef } from "react";
import { type CartItem, useCart } from "@/lib/cart/store";
import { fetchServerCart, mergeCarts, reconcileServerCart, unionCarts } from "@/lib/cart/sync";
import { createClient } from "@/lib/supabase/client";

/**
 * Mantém o carrinho em sincronia com o banco para o usuário logado.
 *
 * - No login (ou carregamento já logado): funde o carrinho local com o do banco
 *   e grava o resultado. Se o carrinho local for de OUTRO usuário (ownerId
 *   diferente), descarta o local e usa só o do banco — evita contaminação entre
 *   contas no mesmo navegador.
 * - Enquanto logado: cada mudança no carrinho é gravada no banco (debounce).
 * - Convidado: nada é gravado; segue só no localStorage.
 *
 * Renderiza null; é montado uma vez no layout.
 */
export function CartSync() {
  const userIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function syncForUser(userId: string) {
      userIdRef.current = userId;
      const store = useCart.getState();
      const server = await fetchServerCart(supabase);

      // Três casos distintos — misturá-los é o que duplicava o carrinho:
      //  - convidado (ownerId null): FUNDE o carrinho anônimo no do banco (soma),
      //    uma única vez, na virada convidado→login;
      //  - mesmo dono recarregando (ownerId === userId): UNIÃO sem somar — local
      //    e banco são o mesmo carrinho já sincronizado;
      //  - carrinho de OUTRA conta neste navegador: descarta o local, usa o banco.
      let next: CartItem[];
      if (store.ownerId === null) next = mergeCarts(store.items, server);
      else if (store.ownerId === userId) next = unionCarts(store.items, server);
      else next = server;

      store.hydrateFromServer(next, userId);
      await reconcileServerCart(supabase, userId, next);
    }

    // onAuthStateChange dispara INITIAL_SESSION no mount (com a sessão atual) e
    // SIGNED_IN/SIGNED_OUT nas mudanças. Deferimos com setTimeout(0) porque o
    // Supabase desaconselha chamadas dentro do callback (risco de deadlock).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        const uid = session.user.id;
        setTimeout(() => {
          syncForUser(uid).catch(() => {});
        }, 0);
      } else if (event === "SIGNED_OUT") {
        userIdRef.current = null;
        // Não limpamos o local: o ownerId marca de quem era, e o próximo login
        // de outra conta não vai fundir esse carrinho.
      }
    });

    // Grava mudanças do carrinho no banco (só enquanto logado), com debounce.
    const unsubStore = useCart.subscribe((state, prev) => {
      const uid = userIdRef.current;
      if (!uid || state.items === prev.items) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        reconcileServerCart(supabase, uid, useCart.getState().items).catch(() => {});
      }, 600);
    });

    return () => {
      sub.subscription.unsubscribe();
      unsubStore();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return null;
}
