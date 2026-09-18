import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCartSync } from "@/hooks/useCartSync";
import { useCartStore } from "@/stores/cartStore";
import { fetchProductByHandle, formatPrice, type ShopifyProduct } from "@/lib/shopify";

export const Route = createFileRoute("/product/$handle")({
  head: ({ params }) => {
    const name = params.handle.replace(/-/g, " ");
    const title = `${name} — Baddazz Clothing`;
    return {
      meta: [
        { title },
        { name: "description", content: `${name} from Baddazz Clothing, printed on demand in sizes XS to 5XL.` },
        { property: "og:title", content: title },
        { property: "og:description", content: `${name} from Baddazz Clothing, printed on demand.` },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { handle } = Route.useParams();
  useCartSync();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => fetchProductByHandle(handle),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <div className="grid gap-10 md:grid-cols-2">
            <div className="aspect-[4/5] animate-pulse rounded bg-muted" />
            <div className="space-y-4">
              <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-6 w-1/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : !product ? (
          <div className="py-24 text-center">
            <h1 className="text-3xl">Product not found</h1>
            <Link to="/shop" className="mt-4 inline-block text-primary hover:underline">
              Back to shop
            </Link>
          </div>
        ) : (
          <ProductDetail product={product} />
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function ProductDetail({ product }: { product: ShopifyProduct }) {
  const node = product.node;
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const variants = node.variants.edges.map((e) => e.node);

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const first = variants.find((v) => v.availableForSale) ?? variants[0];
    return Object.fromEntries((first?.selectedOptions ?? []).map((o) => [o.name, o.value]));
  });
  const [activeImage, setActiveImage] = useState(0);

  const currentVariant = useMemo(
    () => variants.find((v) => v.selectedOptions.every((o) => selected[o.name] === o.value)),
    [variants, selected],
  );

  const images = node.images.edges;

  const handleAdd = async () => {
    if (!currentVariant) return;
    await addItem({
      product,
      variantId: currentVariant.id,
      variantTitle: currentVariant.title,
      price: currentVariant.price,
      quantity: 1,
      selectedOptions: currentVariant.selectedOptions,
    });
    toast.success(`${node.title} added to your bag`, { position: "top-center" });
  };

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="space-y-4">
        <div className="aspect-[4/5] overflow-hidden rounded bg-muted">
          {images[activeImage] && (
            <img
              src={images[activeImage].node.url}
              alt={images[activeImage].node.altText ?? node.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-3">
            {images.map((img, i) => (
              <button
                key={img.node.url}
                onClick={() => setActiveImage(i)}
                className={`h-20 w-16 overflow-hidden rounded border ${i === activeImage ? "border-primary" : "border-border"}`}
              >
                <img src={img.node.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-3xl sm:text-5xl">{node.title}</h1>
        <p className="mt-3 text-2xl">
          {currentVariant
            ? formatPrice(currentVariant.price.amount, currentVariant.price.currencyCode)
            : formatPrice(node.priceRange.minVariantPrice.amount, node.priceRange.minVariantPrice.currencyCode)}
        </p>

        <div className="mt-8 space-y-6">
          {node.options
            .filter((option) => option.values.length > 0 && option.name.toLowerCase() !== "title")
            .map((option) => (
              <div key={option.name}>
                <p className="text-xs tracking-[0.25em] text-muted-foreground uppercase">{option.name}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const isActive = selected[option.name] === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setSelected((prev) => ({ ...prev, [option.name]: value }))}
                        className={`rounded border px-4 py-2 text-sm transition-colors ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-secondary"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        <Button
          onClick={handleAdd}
          size="lg"
          disabled={isLoading || !currentVariant || !currentVariant.availableForSale}
          className="mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : !currentVariant ? (
            "Unavailable combination"
          ) : !currentVariant.availableForSale ? (
            "Sold out"
          ) : (
            "Add to bag"
          )}
        </Button>

        {node.description && (
          <p className="mt-8 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{node.description}</p>
        )}

        <p className="mt-6 text-xs tracking-widest text-muted-foreground uppercase">
          Printed on demand · Ships in 3-7 business days
        </p>
      </div>
    </div>
  );
}
