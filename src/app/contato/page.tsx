import { PagePlaceholder } from "@/components/site/page-placeholder";

import { noIndex } from "@/lib/metadata";

// Placeholder: fora do Google até ter conteúdo (e fora do sitemap).
export const metadata = { title: "Contato", robots: noIndex };

export default function Page() {
  return <PagePlaceholder title="Contato" />;
}
