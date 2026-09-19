import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/shopify";
import { listPendingOrders, type DashboardOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Order dashboard | Baddazz Clothing" },
      { name: "description", content: "Pending orders, print status and shipping tracking for Baddazz Clothing." },
      { property: "og:title", content: "Order dashboard | Baddazz Clothing" },
      { property: "og:description", content: "Pending orders, print status and shipping tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

const PRINT_STAGE: Record<string, { label: string; tone: string }> = {
  UNFULFILLED: { label: "Awaiting print", tone: "bg-primary/15 text-primary" },
  IN_PROGRESS: { label: "In production", tone: "bg-amber-500/15 text-amber-400" },
  PARTIALLY_FULFILLED: { label: "Partly shipped", tone: "bg-amber-500/15 text-amber-400" },
  SCHEDULED: { label: "Scheduled", tone: "bg-muted text-muted-foreground" },
  ON_HOLD: { label: "On hold", tone: "bg-destructive/15 text-destructive" },
  FULFILLED: { label: "Shipped", tone: "bg-emerald-500/15 text-emerald-400" },
  RESTOCKED: { label: "Restocked", tone: "bg-muted text-muted-foreground" },
};

function stage(status: string) {
  return PRINT_STAGE[status] ?? { label: status.toLowerCase().replace(/_/g, " "), tone: "bg-muted text-muted-foreground" };
}

function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchOrders = useServerFn(listPendingOrders);
  const [scope, setScope] = useState<"pending" | "all">("pending");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dashboard-orders", scope],
    queryFn: () => fetchOrders({ data: { scope } }),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const orders = data?.orders ?? [];
  const error = data?.error ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-wide uppercase sm:text-5xl">Orders</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Live from your Shopify store — print stage and tracking for every order.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="rounded border border-border px-3 py-2 text-xs tracking-widest uppercase hover:border-primary"
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
            <button
              onClick={signOut}
              className="rounded border border-border px-3 py-2 text-xs tracking-widest text-muted-foreground uppercase hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {(["pending", "all"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              className={`rounded px-4 py-2 text-xs font-semibold tracking-widest uppercase ${
                scope === value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "pending" ? "Needs action" : "All orders"}
            </button>
          ))}
        </div>

        {error === "missing_token" && (
          <p className="mt-8 rounded border border-border bg-card p-6 text-sm text-muted-foreground">
            Your Shopify order access token hasn't been saved yet. Once you add it, this page fills with real orders.
          </p>
        )}
        {(error === "unauthorized" || error === "scope") && (
          <p className="mt-8 rounded border border-destructive/40 bg-card p-6 text-sm text-muted-foreground">
            Shopify refused the order request. Check that the access token is correct and that the app has permission
            to read orders and fulfilments.
          </p>
        )}
        {error && !["missing_token", "unauthorized", "scope"].includes(error) && (
          <p className="mt-8 rounded border border-destructive/40 bg-card p-6 text-sm text-muted-foreground">
            Couldn't load orders: {error}
          </p>
        )}
        {isError && (
          <p className="mt-8 rounded border border-destructive/40 bg-card p-6 text-sm text-muted-foreground">
            You don't have access to this page, or the connection failed. Try signing out and back in.
          </p>
        )}

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading orders…</p>}

        {!isLoading && !error && orders.length === 0 && (
          <p className="mt-8 rounded border border-border bg-card p-6 text-sm text-muted-foreground">
            {scope === "pending" ? "Nothing waiting — every order has been fulfilled." : "No orders yet."}
          </p>
        )}

        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function OrderCard({ order }: { order: DashboardOrder }) {
  const printStage = stage(order.fulfillmentStatus);
  const placed = new Date(order.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="rounded border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl tracking-wide">{order.name}</h2>
            <span className={`rounded px-2 py-1 text-[10px] font-semibold tracking-widest uppercase ${printStage.tone}`}>
              {printStage.label}
            </span>
            <span className="rounded bg-muted px-2 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {order.financialStatus.toLowerCase().replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {placed} · {order.customer}
            {order.destination ? ` · ${order.destination}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl">{formatPrice(order.total, order.currency)}</p>
          <a
            href={order.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs tracking-widest text-primary uppercase hover:underline"
          >
            Open in Shopify
          </a>
        </div>
      </div>

      <ul className="mt-4 space-y-2 border-t border-border pt-4">
        {order.lines.map((line, index) => (
          <li key={index} className="flex items-center gap-3 text-sm">
            {line.imageUrl ? (
              <img src={line.imageUrl} alt="" width={40} height={40} className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="h-10 w-10 rounded bg-muted" />
            )}
            <span className="flex-1 text-foreground">
              {line.title}
              {line.variantTitle ? <span className="text-muted-foreground"> · {line.variantTitle}</span> : null}
            </span>
            <span className="text-muted-foreground">×{line.quantity}</span>
          </li>
        ))}
      </ul>

      {order.tracking.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs tracking-widest text-muted-foreground uppercase">Tracking</p>
          <ul className="mt-2 space-y-1 text-sm">
            {order.tracking.map((track, index) => (
              <li key={index}>
                <span className="text-muted-foreground">{track.company ?? "Carrier"}: </span>
                {track.url ? (
                  <a href={track.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {track.number ?? "Track parcel"}
                  </a>
                ) : (
                  <span>{track.number ?? "Pending"}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
