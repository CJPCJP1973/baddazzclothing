import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/shopify";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCartSync } from "@/hooks/useCartSync";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop All — Baddazz Clothing" },
      {
        name: "description",
        content: "Browse every Baddazz piece: graphic tees, hoodies, crewnecks and cropped sweats, printed on demand.",
      },
      { property: "og:title", content: "Shop All — Baddazz Clothing" },
      { property: "og:description", content: "Graphic tees, hoodies and crewnecks, printed on demand." },
    ],
  }),
  component: Shop,
});

function Shop() {
  useCartSync();
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchProducts(50),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl sm:text-6xl">Shop all</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Every piece is printed after you order. Pick your size and colour on the product page.
        </p>

        <div className="mt-10">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-16 text-center text-muted-foreground">Couldn't load products right now.</p>
          ) : products.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No products found</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
