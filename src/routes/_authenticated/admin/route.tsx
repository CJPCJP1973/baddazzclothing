import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/orders", label: "Orders", exact: false },
  { to: "/admin/products", label: "Products", exact: false },
  { to: "/admin/discounts", label: "Discounts", exact: false },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-wide uppercase sm:text-5xl">Store admin</h1>
            <p className="mt-2 text-sm text-muted-foreground">Everything about your store, live from Shopify.</p>
          </div>
          <button
            onClick={signOut}
            className="rounded border border-border px-3 py-2 text-xs tracking-widest text-muted-foreground uppercase hover:text-foreground"
          >
            Sign out
          </button>
        </div>

        <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeOptions={{ exact: tab.exact }}
              className="rounded border border-border px-4 py-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase hover:text-foreground"
              activeProps={{ className: "rounded px-4 py-2 text-xs font-semibold tracking-widest uppercase bg-primary text-primary-foreground border border-primary" }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
