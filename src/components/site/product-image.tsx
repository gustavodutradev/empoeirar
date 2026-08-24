import { cn } from "@/lib/utils";

/**
 * Imagem de produto. Se `src` for informado, renderiza a foto; caso contrario,
 * um placeholder na identidade do catalogo (moldura circular com anel bege).
 *
 * Ponte de teste: as fotos vem de public/produtos. Em producao, migram para o
 * Supabase Storage e o componente troca <img> por next/image sem afetar o resto.
 */
export function ProductImage({
  name,
  src,
  className,
}: {
  name: string;
  src?: string;
  className?: string;
}) {
  if (src) {
    return (
      // biome-ignore lint/performance/noImgElement: ponte de teste com imagens locais; migra para next/image com o Storage.
      <img src={src} alt={name} loading="lazy" className={cn("object-cover", className)} />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className={cn("flex items-center justify-center bg-secondary/50", className)}>
      <div className="flex size-20 items-center justify-center rounded-full border-4 border-secondary bg-card">
        <span className="font-display text-2xl text-primary">{initial}</span>
      </div>
    </div>
  );
}
