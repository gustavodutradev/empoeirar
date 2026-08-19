import Link from "next/link";
import { mainNav, siteConfig } from "@/lib/site-config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="font-display text-2xl text-primary">
          {siteConfig.name}
        </Link>

        <nav aria-label="Navegação principal">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-foreground/80 transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/entrar"
                className="text-foreground/80 transition-colors hover:text-primary"
              >
                Entrar
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
