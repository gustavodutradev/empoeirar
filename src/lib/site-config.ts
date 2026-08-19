/**
 * Configuracao central do site: identidade, navegacao e contato.
 * Header e Footer leem daqui para nao duplicar links.
 *
 * TODO(Jane): confirmar e-mail oficial, CNPJ e endereco antes de producao.
 */
export const siteConfig = {
  name: "Empoeirar",
  tagline: "Moldes e ferramentas de madeira para ceramistas.",
  instagramHandle: "@empoeirar",
  instagramUrl: "https://instagram.com/empoeirar",
  whatsappLabel: "(31) 98646-0734",
  whatsappUrl: "https://wa.me/5531986460734",
  email: "contato@empoeirar.com.br", // a confirmar
  cnpj: "a confirmar",
  city: "Belo Horizonte · MG",
} as const;

export type NavLink = { label: string; href: string };

export const mainNav: NavLink[] = [
  { label: "Início", href: "/" },
  { label: "Produtos", href: "/produtos" },
  { label: "Personalizados", href: "/personalizado" },
  { label: "Contato", href: "/contato" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Loja",
    links: [
      { label: "Produtos", href: "/produtos" },
      { label: "Um molde para chamar de seu!", href: "/personalizado" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { label: "Quem somos", href: "/quem-somos" },
      { label: "Perguntas frequentes", href: "/faq" },
      { label: "Como comprar", href: "/como-comprar" },
      { label: "Trocas e devoluções", href: "/trocas-devolucoes" },
      { label: "Política de envio", href: "/politica-envio" },
      { label: "Política de privacidade", href: "/privacidade" },
      { label: "Termos e condições", href: "/termos" },
    ],
  },
];
