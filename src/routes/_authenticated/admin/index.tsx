import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { formatPrice } from "@/lib/shopify";
import { getStoreOverview } from "@/lib/admin.functions";
import { AdminError } from "@/components/AdminError";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Store admin | Baddazz Clothing" },
      { name: "description", content: "Sales, orders and catalogue overview for Baddazz Clothing." },
      { property: "og:title", content: "Store admin | Baddazz Clothing" },
      { property: "og:description", content: "Sales, orders and catalogue overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const fetchOverview = useServerFn(getStoreOverview);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview() });

  if (isLoading) return <p className="mt-8 text-sm text-muted-foreground">Loading store figures…</p>;
  if (data?.error) return <AdminError error={data.error} />;
  if (!data) return null;

  const stats = [
    { label: "Sales (30 days)", value: formatPrice(data.revenue30d, data.currency) },
    { label: "Orders (30 days)", value: String(data.orders30d) },
    { label: "Awaiting fulfilment", value: String(data.awaitingFulfillment) },
    { label: "Products", value: String(data.productCount) },
    { label: "Not on the website", value: String(data.unpublishedCount) },
  ];

  return (
    <div className="mt-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded border border-border bg-card p-5">
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase">{stat.label}</p>
            <p className="mt-2 font-display text-3xl tracking-wide">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl tracking-wide uppercase">Latest orders</h2>
      {data.recent.length === 0 ? (
        <p className="mt-4 rounded border border-border bg-card p-6 text-sm text-muted-foreground">
          No orders in the last 30 days.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded border border-border bg-card">
          {data.recent.map((order) => (
            <li key={order.name} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <span className="font-display text-lg tracking-wide">{order.name}</span>
              <span className="text-muted-foreground">{order.customer}</span>
              <span className="text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span className="rounded bg-muted px-2 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                {order.status.toLowerCase().replace(/_/g, " ")}
              </span>
              <span className="font-display text-lg">{formatPrice(order.total, data.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
