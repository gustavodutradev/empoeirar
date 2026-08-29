import Link from "next/link";

export function CategoryCard({
  name,
  description,
  href,
  cta = "Ver moldes",
  image,
}: {
  name: string;
  description: string | null;
  href: string;
  cta?: string;
  image?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {image ? (
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
          {/* biome-ignore lint/performance/noImgElement: mesma ponte das fotos de produto (Storage); migra p/ next/image junto */}
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2 p-6">
        <h3 className="font-display text-xl text-primary">{name}</h3>
        {description ? <p className="text-sm text-foreground/75">{description}</p> : null}
        <span className="mt-2 text-sm text-primary group-hover:underline">{cta} →</span>
      </div>
    </Link>
  );
}
