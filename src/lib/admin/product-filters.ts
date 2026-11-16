/**
 * Filtros da lista de produtos do admin, lidos da URL.
 *
 * O filtro roda EM MEMÓRIA sobre a lista completa, de propósito: o catálogo
 * tem dezenas de produtos, "sem foto" e "sem medidas" dependem de variantes e
 * imagens (dados aninhados), e assim nenhum texto da URL chega à query do
 * banco. Se o catálogo passar de algumas centenas, vale levar para o SQL.
 *
 * Os filtros de "pendência" existem para o Jane achar o que falta antes de
 * vender: produto sem foto aparece pior na loja, e variante sem peso ou
 * medidas faz o frete sair errado.
 */

export const PRODUCT_STATUSES = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
} as const;

export type ProductStatus = keyof typeof PRODUCT_STATUSES;

export const PRODUCT_ISSUES = {
  sem_foto: "Sem foto",
  sem_medidas: "Sem peso ou medidas",
} as const;

export type ProductIssue = keyof typeof PRODUCT_ISSUES;

export type ProductFilters = {
  q: string;
  status: ProductStatus | null;
  categoryId: string | null;
  issue: ProductIssue | null;
};

export type ProductRow = {
  name: string;
  status: string;
  category_id: string;
  product_image: readonly { id: string }[];
  product_variant: readonly {
    weight_grams: number | null;
    length_mm: number | null;
    width_mm: number | null;
    height_mm: number | null;
  }[];
};

type Raw = string | string[] | undefined;
const first = (v: Raw) => (Array.isArray(v) ? v[0] : v);

/** Limite do texto de busca: evita processar um parâmetro gigante. */
const MAX_QUERY_LENGTH = 80;

export function parseProductFilters(
  params: { q?: Raw; status?: Raw; categoria?: Raw; pendencia?: Raw },
  validCategoryIds: ReadonlySet<string>,
): ProductFilters {
  const q = (first(params.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const status = first(params.status);
  const categoryId = first(params.categoria);
  const issue = first(params.pendencia);

  return {
    q,
    status: status && Object.hasOwn(PRODUCT_STATUSES, status) ? (status as ProductStatus) : null,
    // Só aceita uma categoria que existe: nada de valor livre da URL.
    categoryId: categoryId && validCategoryIds.has(categoryId) ? categoryId : null,
    issue: issue && Object.hasOwn(PRODUCT_ISSUES, issue) ? (issue as ProductIssue) : null,
  };
}

/** Busca sem acento e sem diferença de maiúsculas: "regua" acha "Régua". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const isMissing = (n: number | null) => n == null || n <= 0;

export function hasMissingMeasures(product: ProductRow): boolean {
  if (product.product_variant.length === 0) return true;
  return product.product_variant.some(
    (v) =>
      isMissing(v.weight_grams) ||
      isMissing(v.length_mm) ||
      isMissing(v.width_mm) ||
      isMissing(v.height_mm),
  );
}

export function filterProducts<T extends ProductRow>(
  products: readonly T[],
  filters: ProductFilters,
): T[] {
  const needle = normalizeText(filters.q);
  return products.filter((p) => {
    if (needle && !normalizeText(p.name).includes(needle)) return false;
    if (filters.status && p.status !== filters.status) return false;
    if (filters.categoryId && p.category_id !== filters.categoryId) return false;
    if (filters.issue === "sem_foto" && p.product_image.length > 0) return false;
    if (filters.issue === "sem_medidas" && !hasMissingMeasures(p)) return false;
    return true;
  });
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return Boolean(filters.q || filters.status || filters.categoryId || filters.issue);
}
