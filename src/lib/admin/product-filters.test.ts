import { describe, expect, it } from "vitest";
import {
  filterProducts,
  hasMissingMeasures,
  normalizeText,
  type ProductRow,
  parseProductFilters,
} from "./product-filters";

const CAT_A = "11111111-1111-4111-8111-111111111111";
const CAT_B = "22222222-2222-4222-8222-222222222222";
const cats = new Set([CAT_A, CAT_B]);

const full = { weight_grams: 200, length_mm: 100, width_mm: 50, height_mm: 20 };
const row = (over: Partial<ProductRow> = {}): ProductRow => ({
  name: "Régua Niveladora",
  status: "published",
  category_id: CAT_A,
  product_image: [{ id: "img" }],
  product_variant: [full],
  ...over,
});

describe("parseProductFilters", () => {
  it("valores válidos passam", () => {
    expect(
      parseProductFilters(
        { q: "  régua ", status: "draft", categoria: CAT_B, pendencia: "sem_foto" },
        cats,
      ),
    ).toEqual({ q: "régua", status: "draft", categoryId: CAT_B, issue: "sem_foto" });
  });

  it("valores fora da lista viram null (nunca chegam ao banco)", () => {
    expect(
      parseProductFilters(
        { status: "deleted", categoria: "not-a-category", pendencia: "__proto__" },
        cats,
      ),
    ).toEqual({ q: "", status: null, categoryId: null, issue: null });
  });

  it("busca muito longa é cortada", () => {
    expect(parseProductFilters({ q: "a".repeat(500) }, cats).q).toHaveLength(80);
  });
});

describe("filterProducts", () => {
  const products = [
    row({ name: "Régua Niveladora" }),
    row({ name: "Nuvens", product_image: [] }),
    row({ name: "Oval", status: "draft", category_id: CAT_B }),
    row({ name: "Elipses", product_variant: [{ ...full, weight_grams: null }] }),
  ];
  const none = { q: "", status: null, categoryId: null, issue: null };

  it("busca ignora acento e maiúsculas", () => {
    expect(filterProducts(products, { ...none, q: "REGUA" }).map((p) => p.name)).toEqual([
      "Régua Niveladora",
    ]);
  });

  it("filtra por status e categoria", () => {
    expect(filterProducts(products, { ...none, status: "draft" }).map((p) => p.name)).toEqual([
      "Oval",
    ]);
    expect(filterProducts(products, { ...none, categoryId: CAT_B }).map((p) => p.name)).toEqual([
      "Oval",
    ]);
  });

  it("pendências: sem foto e sem medidas", () => {
    expect(filterProducts(products, { ...none, issue: "sem_foto" }).map((p) => p.name)).toEqual([
      "Nuvens",
    ]);
    expect(filterProducts(products, { ...none, issue: "sem_medidas" }).map((p) => p.name)).toEqual([
      "Elipses",
    ]);
  });
});

describe("hasMissingMeasures", () => {
  it("peso zero conta como faltando (frete sairia errado)", () => {
    expect(hasMissingMeasures(row({ product_variant: [{ ...full, weight_grams: 0 }] }))).toBe(true);
  });

  it("produto sem variante conta como faltando", () => {
    expect(hasMissingMeasures(row({ product_variant: [] }))).toBe(true);
  });

  it("uma variante incompleta basta", () => {
    expect(hasMissingMeasures(row({ product_variant: [full, { ...full, height_mm: null }] }))).toBe(
      true,
    );
  });
});

describe("normalizeText", () => {
  it("remove acentos", () => {
    expect(normalizeText("Manteigueira Francesa Araçuaí")).toBe("manteigueira francesa aracuai");
  });
});
