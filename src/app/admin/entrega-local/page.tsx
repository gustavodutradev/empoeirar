import type { Metadata } from "next";
import {
  AddDistrictForm,
  LocalDeliveryConfigForm,
  RemoveDistrictButton,
} from "@/components/site/admin-local-delivery";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata: Metadata = { title: "Admin · Entrega local" };

export default async function AdminLocalDeliveryPage() {
  const { supabase } = await requireAdmin();

  const [{ data: config }, { data: districts }] = await Promise.all([
    supabase
      .from("local_delivery_config")
      .select("enabled, price_cents, delivery_days")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("local_delivery_district").select("id, name").order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl text-primary">Entrega local</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Entrega em Belo Horizonte feita pelo ateliê. A opção aparece no checkout quando o CEP do
          cliente é de um dos bairros abaixo. O bairro vem do próprio CEP (Correios/ViaCEP), não do
          que o cliente digita.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-display text-lg text-primary">Tarifa e prazo</h2>
        <LocalDeliveryConfigForm
          enabled={config?.enabled ?? false}
          priceCents={config?.price_cents ?? 0}
          deliveryDays={config?.delivery_days ?? 2}
        />
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-display text-lg text-primary">
          Bairros atendidos ({districts?.length ?? 0})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escreva o nome como os Correios usam. Acento e maiúsculas não importam. Atenção a nomes
          parecidos: “Horto” e “Horto Florestal” são bairros diferentes.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {(districts ?? []).map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-1 rounded-full border bg-background py-1 pr-1 pl-3 text-sm"
            >
              {d.name}
              <RemoveDistrictButton id={d.id} name={d.name} />
            </li>
          ))}
        </ul>
        <AddDistrictForm />
      </section>
    </div>
  );
}
