import { cn } from "@/lib/utils";

/**
 * Placeholder de imagem de produto na identidade do catalogo (moldura circular
 * com anel bege). As fotos reais entram depois, via Supabase Storage; quando
 * isso acontecer, este componente passa a renderizar o <Image> real e o resto
 * do site nao muda.
 */
export function ProductImage({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className={cn("flex items-center justify-center bg-secondary/50", className)}>
      <div className="flex size-20 items-center justify-center rounded-full border-4 border-secondary bg-card">
        <span className="font-display text-2xl text-primary">{initial}</span>
      </div>
    </div>
  );
}
