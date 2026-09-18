import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/shopify";
import { ProductCard } from "@/components/ProductCard";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCartSync } from "@/hooks/useCartSync";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Baddazz Clothing — Women's Streetwear, Printed On Demand" },
      {
        name: "description",
        content:
          "Bold women's tees, hoodies and crewnecks with attitude. Made to order, printed on demand, shipped worldwide.",
      },
      { property: "og:title", content: "Baddazz Clothing — Women's Streetwear" },
      {
        property: "og:description",
        content: "Bold women's tees, hoodies and crewnecks with attitude. Printed on demand.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  useCartSync();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts(8),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div className="space-y-6">
            <p className="text-xs tracking-[0.35em] text-primary uppercase">Made to order · Zero waste</p>
            <h1 className="text-5xl leading-[0.9] sm:text-7xl">
              Wear it
              <br />
              like you
              <br />
              <span className="text-primary">mean it.</span>
            </h1>
            <p className="max-w-md text-muted-foreground">
              Women's tees, hoodies and crewnecks with something to say. Every piece is printed after you order it, so
              nothing ends up in a landfill.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="rounded bg-primary px-6 py-3 text-sm font-semibold tracking-widest text-primary-foreground uppercase transition-opacity hover:opacity-90"
              >
                Shop the drop
              </Link>
              <Link
                to="/about"
                className="rounded border border-border px-6 py-3 text-sm font-semibold tracking-widest uppercase transition-colors hover:bg-secondary"
              >
                How it works
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 bg-primary/20 blur-3xl" />
            <img
              src={hero}
              alt="Model wearing an oversized cropped graphic hoodie"
              width={1408}
              height={1600}
              className="aspect-[4/5] w-full rounded object-cover"
            />
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-b border-border bg-primary py-3">
        <div className="marquee-track flex w-max gap-10 text-sm font-semibold tracking-[0.3em] whitespace-nowrap text-primary-foreground uppercase">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className="flex gap-10">
              <span>Printed on demand</span>
              <span>Sizes XS–5XL</span>
              <span>Secure Shopify checkout</span>
              <span>New drops monthly</span>
              <span>Printed on demand</span>
              <span>Sizes XS–5XL</span>
              <span>Secure Shopify checkout</span>
              <span>New drops monthly</span>
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-3xl sm:text-4xl">Fresh picks</h2>
          <Link to="/shop" className="text-sm tracking-widest text-primary uppercase hover:underline">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No products found</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.node.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
