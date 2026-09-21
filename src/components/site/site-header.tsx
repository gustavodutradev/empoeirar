import Link from "next/link";
import { Suspense } from "react";
import { AuthNav } from "@/components/site/auth-nav";
import { CartIndicator } from "@/components/site/cart-indicator";
import { MobileMenu } from "@/components/site/mobile-menu";
import { NavLinks } from "@/components/site/nav-links";
import { mainNav, siteConfig } from "@/lib/site-config";

/**
 * Header responsivo:
 *  - >= lg (1024px): logo | links + login | carrinho.
 *  - <  lg: logo | carrinho + botao de menu (menu lateral com links e login).
 * O corte e em lg (nao md) porque, logado como admin, a linha desktop tem ~8
 * itens e aperta em tablets de 768px.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:py-4">
        <Link href="/" aria-label={`${siteConfig.name} — início`} className="shrink-0">
          {/* biome-ignore lint/performance/noImgElement: logo local em public/, sem otimização remota */}
          <img src="/logo-empoeirar.png" alt={siteConfig.name} className="h-9 w-auto lg:h-11" />
        </Link>

        <div className="flex items-center gap-1 lg:gap-6">
          <nav aria-label="Navegação principal" className="hidden text-sm lg:block">
            <NavLinks items={mainNav} variant="desktop" />
          </nav>
          <div className="hidden text-sm lg:block">
            <Suspense
              fallback={
                <Link
                  href="/entrar"
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  Entrar
                </Link>
              }
            >
              <AuthNav />
            </Suspense>
          </div>
          <CartIndicator />
          <MobileMenu>
            <Suspense fallback={<div className="min-h-12" aria-hidden />}>
              <AuthNav variant="mobile" />
            </Suspense>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
