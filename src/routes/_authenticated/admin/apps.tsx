import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";

import { listInstalledApps, STORE_HANDLE } from "@/lib/admin.functions";
import { AdminError } from "@/components/AdminError";

export const Route = createFileRoute("/_authenticated/admin/apps")({
  head: () => ({
    meta: [
      { title: "Apps | Baddazz Clothing admin" },
      { name: "description", content: "See every app installed on the Baddazz Clothing store." },
      { property: "og:title", content: "Apps | Baddazz Clothing admin" },
      { property: "og:description", content: "Installed store apps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppsPage,
});

function AppsPage() {
  const fetchApps = useServerFn(listInstalledApps);
  const { data, isLoading } = useQuery({ queryKey: ["admin-apps"], queryFn: () => fetchApps() });

  const apps = data?.apps ?? [];

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wide uppercase">Installed apps</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything connected to the store. Open an app in Shopify to manage it.
          </p>
        </div>
        <a
          href={`https://admin.shopify.com/store/${STORE_HANDLE}/apps`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-border px-4 py-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase hover:text-foreground"
        >
          Open app store
        </a>
      </div>

      {data?.error && <AdminError error={data.error} />}
      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading apps…</p>}
      {!isLoading && !data?.error && apps.length === 0 && (
        <p className="mt-8 rounded border border-border bg-card p-6 text-sm text-muted-foreground">
          No apps installed yet.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {apps.map((app) => (
          <article key={app.id} className="flex flex-col justify-between gap-4 rounded border border-border bg-card p-5">
            <div>
              <h3 className="font-display text-xl tracking-wide">{app.title}</h3>
              {app.developerName && (
                <p className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">by {app.developerName}</p>
              )}
              {app.description && <p className="mt-3 text-sm text-muted-foreground">{app.description}</p>}
            </div>
            {app.launchUrl && (
              <a
                href={app.launchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded bg-primary px-4 py-2 text-xs font-semibold tracking-widest text-primary-foreground uppercase"
              >
                Open in Shopify <ExternalLink className="size-3" />
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
