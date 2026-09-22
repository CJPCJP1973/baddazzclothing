import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div className="space-y-4">
          <img src={logo} alt="Baddazz Clothing" width={1152} height={576} loading="lazy" className="h-8 w-auto" />
          <p className="max-w-xs text-sm text-muted-foreground">
            Women's streetwear with attitude. Printed on demand, one piece at a time — nothing sits in a warehouse.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <h3 className="font-display text-base">Shop</h3>
          <div className="flex flex-col gap-2 text-muted-foreground">
            <Link to="/shop" className="hover:text-foreground">
              All pieces
            </Link>
            <Link to="/about" className="hover:text-foreground">
              How print on demand works
            </Link>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <h3 className="font-display text-base">Good to know</h3>
          <p className="text-muted-foreground">
            Orders are made to order and ship within 2–4 business days. Checkout, payments and shipping are
            handled securely through Shopify.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs tracking-widest text-muted-foreground uppercase">
        © {new Date().getFullYear()} Baddazz Clothing
      </div>
    </footer>
  );
}
