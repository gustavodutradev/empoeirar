"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { selectCount, useCart, useHasHydrated } from "@/lib/cart/store";

export function CartIndicator() {
  const count = useCart(selectCount);
  const hydrated = useHasHydrated();
  const show = hydrated && count > 0;

  return (
    <Link
      href="/carrinho"
      aria-label={show ? `Carrinho (${count} itens)` : "Carrinho"}
      className="relative flex size-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ShoppingBag className="size-5" />
      {show ? (
        <span className="-right-1 -top-1 absolute flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-center font-medium text-[11px] text-primary-foreground tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
