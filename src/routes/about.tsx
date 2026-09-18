import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How Print On Demand Works — Baddazz Clothing" },
      {
        name: "description",
        content:
          "Baddazz pieces are printed after you order them. Here's how made-to-order women's apparel, sizing and shipping work.",
      },
      { property: "og:title", content: "How Print On Demand Works — Baddazz Clothing" },
      { property: "og:description", content: "Made-to-order women's apparel: how printing, sizing and shipping work." },
    ],
  }),
  component: About,
});

const steps = [
  {
    title: "You order",
    body: "Pick your piece, size and colour. Checkout is handled securely through Shopify with all the usual payment options.",
  },
  {
    title: "We print it",
    body: "Your garment goes into production only after the order lands — no bulk runs, no dead stock, no waste.",
  },
  {
    title: "It ships to you",
    body: "Made-to-order items typically leave the print house in 3-7 business days, then travel with tracked shipping.",
  },
];

function About() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-xs tracking-[0.35em] text-primary uppercase">The Baddazz way</p>
        <h1 className="mt-4 text-4xl sm:text-6xl">Loud clothes, light footprint</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Baddazz is women's streetwear built around one idea: nothing gets made until someone wants it. That means
          sharper graphics, more sizes, and no pile of unsold stock at the end of a season.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded border border-border bg-card p-6">
              <span className="font-display text-4xl text-primary">0{i + 1}</span>
              <h2 className="mt-3 text-xl">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded border border-border bg-card p-8">
          <h2 className="text-2xl">Sizing &amp; care</h2>
          <p className="mt-3 text-muted-foreground">
            Most styles run from XS to 5XL — the exact range for each piece is listed on its product page. Wash inside
            out, cold, and skip the tumble dryer to keep prints sharp.
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-block rounded bg-primary px-6 py-3 text-sm font-semibold tracking-widest text-primary-foreground uppercase hover:opacity-90"
          >
            Shop the collection
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
