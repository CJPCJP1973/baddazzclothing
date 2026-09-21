import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { formatPrice } from "@/lib/shopify";
import { listAdminProducts, updateAdminProduct, type AdminProduct } from "@/lib/admin.functions";
import { AdminError } from "@/components/AdminError";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Products | Baddazz Clothing admin" },
      { name: "description", content: "Edit titles, prices, descriptions and visibility for Baddazz Clothing." },
      { property: "og:title", content: "Products | Baddazz Clothing admin" },
      { property: "og:description", content: "Edit titles, prices, descriptions and visibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const fetchProducts = useServerFn(listAdminProducts);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", term],
    queryFn: () => fetchProducts({ data: { search: term } }),
  });

  const products = data?.products ?? [];

  return (
    <div className="mt-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setTerm(search.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
          className="w-full max-w-sm rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button className="rounded border border-border px-4 py-2 text-xs tracking-widest uppercase hover:border-primary">
          Search
        </button>
      </form>

      {data?.error && <AdminError error={data.error} />}
      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading products…</p>}
      {!isLoading && !data?.error && products.length === 0 && (
        <p className="mt-8 rounded border border-border bg-card p-6 text-sm text-muted-foreground">
          No products matched.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            open={editing === product.id}
            onToggle={() => setEditing(editing === product.id ? null : product.id)}
          />
        ))}
      </div>
    </div>
  );
}

function stripHtml(html: string) {
  return html
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function ProductRow({
  product,
  open,
  onToggle,
}: {
  product: AdminProduct;
  open: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(updateAdminProduct);
  const [title, setTitle] = useState(product.title);
  const [price, setPrice] = useState(product.price);
  const [description, setDescription] = useState(stripHtml(product.descriptionHtml));
  const [status, setStatus] = useState(product.status as "ACTIVE" | "DRAFT" | "ARCHIVED");

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: product.id,
          title,
          status,
          descriptionHtml: toHtml(description),
          ...(price !== product.price && product.variantCount === 1
            ? { price, variantId: product.variantId }
            : {}),
        },
      }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`${title} saved`);
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        onToggle();
      } else {
        toast.error(result.error ?? "Couldn't save");
      }
    },
    onError: () => toast.error("Couldn't save"),
  });

  return (
    <article className="rounded border border-border bg-card">
      <div className="flex flex-wrap items-center gap-4 p-4">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" width={56} height={56} className="h-14 w-14 rounded object-cover" />
        ) : (
          <div className="h-14 w-14 rounded bg-muted" />
        )}
        <div className="min-w-48 flex-1">
          <p className="font-semibold">{product.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-2 py-0.5 tracking-widest uppercase">{product.status.toLowerCase()}</span>
            {!product.published && (
              <span className="rounded bg-amber-500/15 px-2 py-0.5 tracking-widest text-amber-400 uppercase">
                Not on website
              </span>
            )}
            <span>{product.variantCount} option{product.variantCount === 1 ? "" : "s"}</span>
          </p>
        </div>
        <p className="font-display text-xl">{formatPrice(product.price, product.currency)}</p>
        <div className="flex gap-2">
          <button
            onClick={onToggle}
            className="rounded border border-border px-3 py-2 text-xs tracking-widest uppercase hover:border-primary"
          >
            {open ? "Close" : "Edit"}
          </button>
          <a
            href={product.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-border px-3 py-2 text-xs tracking-widest text-muted-foreground uppercase hover:text-foreground"
          >
            Shopify
          </a>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs tracking-widest text-muted-foreground uppercase">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground outline-none focus:border-primary"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-xs tracking-widest text-muted-foreground uppercase">
                Price
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  disabled={product.variantCount !== 1}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm tracking-normal text-foreground outline-none focus:border-primary disabled:opacity-50"
                />
                {product.variantCount !== 1 && (
                  <span className="mt-1 block normal-case tracking-normal">Sizes priced separately in Shopify</span>
                )}
              </label>
              <label className="block text-xs tracking-widest text-muted-foreground uppercase">
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as "ACTIVE" | "DRAFT" | "ARCHIVED")}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm tracking-normal text-foreground outline-none focus:border-primary"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
            </div>
          </div>
          <label className="block text-xs tracking-widest text-muted-foreground uppercase">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm normal-case tracking-normal text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded bg-primary px-5 py-2 text-xs font-semibold tracking-widest text-primary-foreground uppercase disabled:opacity-60"
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </article>
  );
}
