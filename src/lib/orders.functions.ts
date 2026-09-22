import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_API_VERSION = "2025-07";
const STORE_DOMAIN = "mq9xvc-xc.myshopify.com";

export interface DashboardOrderLine {
  title: string;
  variantTitle: string | null;
  quantity: number;
  imageUrl: string | null;
}

export interface DashboardTracking {
  company: string | null;
  number: string | null;
  url: string | null;
}

export interface DashboardOrder {
  id: string;
  name: string;
  createdAt: string;
  customer: string;
  destination: string;
  total: string;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  adminUrl: string;
  lines: DashboardOrderLine[];
  tracking: DashboardTracking[];
}

export interface OrdersResult {
  orders: DashboardOrder[];
  error: string | null;
}

const ORDERS_QUERY = `
  query DashboardOrders($first: Int!, $query: String) {
    orders(first: $first, reverse: true, query: $query) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { displayName }
          shippingAddress { city province country }
          lineItems(first: 25) {
            edges {
              node {
                title
                quantity
                variantTitle
                image { url }
              }
            }
          }
          fulfillments(first: 10) {
            status
            trackingInfo(first: 5) { company number url }
          }
        }
      }
    }
  }
`;

type RawOrder = {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: { displayName: string | null } | null;
  shippingAddress: { city: string | null; province: string | null; country: string | null } | null;
  lineItems: {
    edges: Array<{
      node: { title: string; quantity: number; variantTitle: string | null; image: { url: string } | null };
    }>;
  };
  fulfillments: Array<{
    status: string | null;
    trackingInfo: Array<{ company: string | null; number: string | null; url: string | null }>;
  }>;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export const listPendingOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope?: "pending" | "all" } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<OrdersResult> => {
    await assertAdmin(context as never);

    // Prefer the connected store's Admin API token; fall back to a user-supplied one.
    const token = process.env["SHOPIFY_ACCESS_TOKEN"] ?? process.env["SHOPIFY_ADMIN_ACCESS_TOKEN"];
    if (!token) {
      return { orders: [], error: "missing_token" };
    }

    const query =
      data.scope === "all"
        ? "status:any"
        : "status:open AND (fulfillment_status:unfulfilled OR fulfillment_status:partial)";

    const response = await fetch(`https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query: ORDERS_QUERY, variables: { first: 50, query } }),
    });

    if (response.status === 401 || response.status === 403) {
      return { orders: [], error: "unauthorized" };
    }
    if (!response.ok) {
      return { orders: [], error: `http_${response.status}` };
    }

    const payload = (await response.json()) as {
      data?: { orders?: { edges: Array<{ node: RawOrder }> } };
      errors?: Array<{ message: string }>;
    };

    if (payload.errors?.length) {
      const message = payload.errors.map((e) => e.message).join(", ");
      return { orders: [], error: /access|scope|permission/i.test(message) ? "scope" : message };
    }

    const orders = (payload.data?.orders?.edges ?? []).map(({ node }) => {
      const numericId = node.id.split("/").pop() ?? "";
      const address = node.shippingAddress;
      return {
        id: node.id,
        name: node.name,
        createdAt: node.createdAt,
        customer: node.customer?.displayName ?? "Guest",
        destination: [address?.city, address?.province, address?.country].filter(Boolean).join(", "),
        total: node.totalPriceSet.shopMoney.amount,
        currency: node.totalPriceSet.shopMoney.currencyCode,
        financialStatus: node.displayFinancialStatus ?? "UNKNOWN",
        fulfillmentStatus: node.displayFulfillmentStatus ?? "UNFULFILLED",
        adminUrl: `https://admin.shopify.com/store/${STORE_DOMAIN.replace(".myshopify.com", "")}/orders/${numericId}`,
        lines: node.lineItems.edges.map((l) => ({
          title: l.node.title,
          variantTitle: l.node.variantTitle,
          quantity: l.node.quantity,
          imageUrl: l.node.image?.url ?? null,
        })),
        tracking: (node.fulfillments ?? []).flatMap((f) =>
          (f.trackingInfo ?? []).map((t) => ({ company: t.company, number: t.number, url: t.url })),
        ),
      } satisfies DashboardOrder;
    });

    return { orders, error: null };
  });
