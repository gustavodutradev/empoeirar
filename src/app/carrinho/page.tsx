import { CartView } from "@/components/site/cart-view";

export const metadata = { title: "Carrinho" };

export default function CarrinhoPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="font-display text-4xl text-primary">Carrinho</h1>
      <div className="mt-8">
        <CartView />
      </div>
    </main>
  );
}
