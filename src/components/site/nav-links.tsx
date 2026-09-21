"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/** "/" so casa exato; o resto casa por prefixo (ex.: /produtos/banana -> Produtos). */
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Links da navegacao principal com indicacao da pagina atual (aria-current),
 * que ajuda tanto o leitor de tela quanto quem esta no celular a se situar.
 */
export function NavLinks({ items, variant }: { items: NavLink[]; variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <ul className="flex flex-col">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center rounded-lg px-3 font-display text-2xl transition-colors",
                  active
                    ? "bg-secondary/70 text-primary"
                    : "text-foreground/85 hover:bg-secondary/40 hover:text-primary",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="flex items-center gap-x-6">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "underline-offset-8 transition-colors hover:text-primary",
                active ? "text-primary underline decoration-primary/40" : "text-foreground/80",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
