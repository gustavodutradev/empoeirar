"use client";

import { AtSign, Menu, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { NavLinks } from "@/components/site/nav-links";
import { mainNav, siteConfig } from "@/lib/site-config";

const secondaryLinks = [
  { label: "Como comprar", href: "/como-comprar" },
  { label: "Perguntas frequentes", href: "/faq" },
  { label: "Quem somos", href: "/quem-somos" },
];

/**
 * Menu lateral do mobile sobre <dialog> com showModal(): foco preso, Esc e
 * fundo inerte vem do navegador. `children` recebe o <AuthNav> (server).
 */
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Se a tela crescer ate o breakpoint desktop com o menu aberto (rotacao do
  // tablet), fecha: o menu some via CSS e o fundo ficaria inerte sem motivo.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) dialogRef.current?.close();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        aria-controls="menu-mobile"
        className="flex size-11 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:hidden"
      >
        <Menu className="size-6" />
      </button>

      {/* Clique no backdrop (o proprio <dialog>) ou em qualquer link fecha o menu.
          Teclado ja e coberto nativamente pelo Esc do dialog. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Esc nativo do <dialog> cobre o teclado */}
      <dialog
        id="menu-mobile"
        ref={dialogRef}
        aria-label="Menu"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target === e.currentTarget || target.closest("a")) close();
        }}
        className="drawer m-0 ml-auto h-dvh max-h-none w-[86vw] max-w-sm bg-background p-0 text-foreground shadow-2xl"
      >
        <div className="flex h-full flex-col overflow-y-auto overscroll-contain px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between pb-2">
            <span className="px-3 text-sm uppercase tracking-wider text-muted-foreground">
              Menu
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar menu"
              className="flex size-11 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <X className="size-6" />
            </button>
          </div>

          <nav aria-label="Navegação principal">
            <NavLinks items={mainNav} variant="mobile" />
          </nav>

          <div className="my-4 border-t" />
          {children}

          <div className="my-4 border-t" />
          <ul className="flex flex-col">
            {secondaryLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-11 items-center rounded-lg px-3 text-foreground/75 transition-colors hover:text-primary"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-1 pt-6">
            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-foreground/75 hover:text-primary"
            >
              <MessageCircle className="size-5" aria-hidden />
              {siteConfig.whatsappLabel}
            </a>
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-foreground/75 hover:text-primary"
            >
              <AtSign className="size-5" aria-hidden />
              {siteConfig.instagramHandle}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
