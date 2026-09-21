import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { createDiscount, deleteDiscount, listDiscounts } from "@/lib/admin.functions";
import { AdminError } from "@/components/AdminError";

export const Route = createFileRoute("/_authenticated/admin/discounts")({
  head: () => ({
    meta: [
      { title: "Discounts | Baddazz Clothing admin" },
      { name: "description", content: "Create and manage discount codes for Baddazz Clothing." },
      { property: "og:title", content: "Discounts | Baddazz Clothing admin" },
      { property: "og:description", content: "Create and manage discount codes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiscountsPage,
});

function DiscountsPage() {
  const queryClient = useQueryClient();
  const fetchDiscounts = useServerFn(listDiscounts);
  const create = useServerFn(createDiscount);
  const remove = useServerFn(deleteDiscount);

  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percentage" | "amount">("percentage");
  const [amount, setAmount] = useState("10");
  const [endsAt, setEndsAt] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["admin-discounts"], queryFn: () => fetchDiscounts() });

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          code: code.trim().toUpperCase(),
          kind,
          amount: Number(amount),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        },
      }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Discount code created");
        setCode("");
        queryClient.invalidateQueries({ queryKey: ["admin-discounts"] });
      } else {
        toast.error(result.error ?? "Couldn't create the code");
      }
    },
    onError: () => toast.error("Couldn't create the code"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Discount deleted");
        queryClient.invalidateQueries({ queryKey: ["admin-discounts"] });
      } else {
        toast.error(result.error ?? "Couldn't delete the code");
      }
    },
    onError: () => toast.error("Couldn't delete the code"),
  });

  const discounts = data?.discounts ?? [];

  return (
    <div className="mt-8">
      <section className="rounded border border-border bg-card p-5">
        <h2 className="font-display text-2xl tracking-wide uppercase">New discount code</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!code.trim()) return toast.error("Give the code a name, like BADDAZZ10");
            createMutation.mutate();
          }}
          className="mt-4 grid gap-4 sm:grid-cols-4"
        >
          <label className="block text-xs tracking-widest text-muted-foreground uppercase">
            Code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="BADDAZZ10"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm tracking-normal text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block text-xs tracking-widest text-muted-foreground uppercase">
            Type
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as "percentage" | "amount")}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm tracking-normal text-foreground outline-none focus:border-primary"
            >
              <option value="percentage">Percent off</option>
              <option value="amount">Fixed amount off</option>
            </select>
          </label>
          <label className="block text-xs tracking-widest text-muted-foreground uppercase">
            {kind === "percentage" ? "Percent" : "Amount"}
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm tracking-normal text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block text-xs tracking-widest text-muted-foreground uppercase">
            Ends (optional)
            <input
              type="date"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm tracking-normal text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            disabled={createMutation.isPending}
            className="rounded bg-primary px-5 py-2 text-xs font-semibold tracking-widest text-primary-foreground uppercase disabled:opacity-60 sm:col-span-1"
          >
            {createMutation.isPending ? "Creating…" : "Create code"}
          </button>
        </form>
      </section>

      {data?.error && <AdminError error={data.error} />}
      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading discounts…</p>}
      {!isLoading && !data?.error && discounts.length === 0 && (
        <p className="mt-8 rounded border border-border bg-card p-6 text-sm text-muted-foreground">
          No discount codes yet.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {discounts.map((discount) => (
          <article
            key={discount.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded border border-border bg-card p-4"
          >
            <div>
              <p className="font-display text-xl tracking-wide">{discount.code || discount.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {discount.value} · used {discount.usageCount} time{discount.usageCount === 1 ? "" : "s"}
                {discount.endsAt ? ` · ends ${new Date(discount.endsAt).toLocaleDateString("en-US")}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded bg-muted px-2 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {discount.status.toLowerCase()}
              </span>
              <button
                onClick={() => deleteMutation.mutate(discount.id)}
                disabled={deleteMutation.isPending}
                className="rounded border border-destructive/40 px-3 py-2 text-xs tracking-widest text-destructive uppercase hover:bg-destructive/10 disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
