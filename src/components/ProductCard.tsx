import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice, type ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const node = product.node;
  const image = node.images.edges[0]?.node;
  const variant = node.variants.edges.find((v) => v.node.availableForSale)?.node ?? node.variants.edges[0]?.node;
  const hasChoices = node.options.some((o) => o.values.length > 1);

  const handleAddToCart = async () => {
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success(`${node.title} added to your bag`, { position: "top-center" });
  };

  return (
    <div className="group flex flex-col">
      <Link
        to="/product/$handle"
        params={{ handle: node.handle }}
        className="relative block aspect-[4/5] overflow-hidden rounded bg-muted"
      >
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? node.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs tracking-widest text-muted-foreground uppercase">
            No image
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 pt-4">
        <Link to="/product/$handle" params={{ handle: node.handle }} className="font-display text-base leading-tight">
          {node.title}
        </Link>
        <p className="text-sm text-muted-foreground">
          {formatPrice(node.priceRange.minVariantPrice.amount, node.priceRange.minVariantPrice.currencyCode)}
        </p>
        <div className="pt-3">
          {hasChoices ? (
            <Button asChild variant="outline" className="w-full border-border bg-transparent">
              <Link to="/product/$handle" params={{ handle: node.handle }}>
                Choose options
              </Link>
            </Button>
          ) : (
            <Button
              onClick={handleAddToCart}
              disabled={isLoading || !variant}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to bag"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
