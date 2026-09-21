import { AtSign, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { footerNav, siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
          {/* biome-ignore lint/performance/noImgElement: logo local em public/, sem otimização remota */}
          <img src="/logo-empoeirar.png" alt={siteConfig.name} className="h-16 w-auto self-start" />
          <p className="max-w-xs text-sm text-secondary-foreground/90">{siteConfig.tagline}</p>
        </div>

        {footerNav.map((section) => (
          <nav key={section.title} aria-label={section.title}>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">
              {section.title}
            </h2>
            <ul className="flex flex-col gap-1 text-sm">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-1.5 text-secondary-foreground/80 transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="col-span-2 sm:col-span-1">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">
            Atendimento
          </h2>
          <ul className="flex flex-col gap-3 text-sm">
            <li>
              <a
                href={siteConfig.whatsappUrl}
                className="inline-flex items-center gap-2 hover:text-primary"
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" aria-hidden />
                {siteConfig.whatsappLabel}
              </a>
            </li>
            <li>
              <a
                href={siteConfig.instagramUrl}
                className="inline-flex items-center gap-2 hover:text-primary"
                target="_blank"
                rel="noreferrer"
              >
                <AtSign className="size-4" aria-hidden />
                {siteConfig.instagramHandle}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center gap-2 hover:text-primary"
              >
                <Mail className="size-4" aria-hidden />
                {siteConfig.email}
              </a>
            </li>
            <li className="pt-1 text-secondary-foreground/70">{siteConfig.city}</li>
            <li className="text-secondary-foreground/70">CNPJ: {siteConfig.cnpj}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary/10">
        <div className="mx-auto max-w-6xl px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs sm:px-6 text-secondary-foreground/70">
          © {year} {siteConfig.name}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
