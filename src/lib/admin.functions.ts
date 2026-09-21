import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_API_VERSION = "2025-07";
const STORE_DOMAIN = "mq9xvc-xc.myshopify.com";
export const STORE_HANDLE = STORE_DOMAIN.replace(".myshopify.com", "");

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

type GraphqlResult<T> = { data: T | null; error: string | null };

async function adminGraphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<GraphqlResult<T>> {
  const token = process.env["SHOPIFY_ACCESS_TOKEN"] ?? process.env["SHOPIFY_ADMIN_ACCESS_TOKEN"];
  if (!token) return { data: null, error: "missing_token" };

  const response = await fetch(`https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 401 || response.status === 403) return { data: null, error: "unauthorized" };
  if (!response.ok) return { data: null, error: `http_${response.status}` };

  const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (payload.errors?.length) {
    const message = payload.errors.map((e) => e.message).join(", ");
    return { data: null, error: /access|scope|permission/i.test(message) ? "scope" : message };
  }
  return { data: payload.data ?? null, error: null };
}

/* ---------------------------------- overview --------------------------------- */

export interface StoreOverview {
  revenue30d: string;
  currency: string;
  orders30d: number;
  awaitingFulfillment: number;
  productCount: number;
  unpublishedCount: number;
  recent: Array<{ name: string; customer: string; total: string; status: string; createdAt: string }>;
  error: string | null;
}

const OVERVIEW_QUERY = `
  query Overview($since: String!) {
    orders(first: 100, reverse: true, query: $since) {
      edges {
        node {
          name
          createdAt
          displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { displayName }
        }
      }
    }
    productsCount { count }
    products(first: 250) { edges { node { onlineStoreUrl } } }
  }
`;

export const getStoreOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StoreOverview> => {
    await assertAdmin(context as never);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data, error } = await adminGraphql<{
      orders: {
        edges: Array<{
          node: {
            name: string;
            createdAt: string;
            displayFulfillmentStatus: string | null;
            totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
            customer: { displayName: string | null } | null;
          };
        }>;
      };
      productsCount: { count: number };
      products: { edges: Array<{ node: { onlineStoreUrl: string | null } }> };
    }>(OVERVIEW_QUERY, { since: `created_at:>=${since}` });

    const empty: StoreOverview = {
      revenue30d: "0",
      currency: "USD",
      orders30d: 0,
      awaitingFulfillment: 0,
      productCount: 0,
      unpublishedCount: 0,
      recent: [],
      error,
    };
    if (!data) return empty;

    const nodes = data.orders.edges.map((e) => e.node);
    const revenue = nodes.reduce((sum, n) => sum + Number(n.totalPriceSet.shopMoney.amount), 0);

    return {
      revenue30d: revenue.toFixed(2),
      currency: nodes[0]?.totalPriceSet.shopMoney.currencyCode ?? "USD",
      orders30d: nodes.length,
      awaitingFulfillment: nodes.filter((n) => n.displayFulfillmentStatus !== "FULFILLED").length,
      productCount: data.productsCount?.count ?? 0,
      unpublishedCount: data.products.edges.filter((e) => !e.node.onlineStoreUrl).length,
      recent: nodes.slice(0, 6).map((n) => ({
        name: n.name,
        customer: n.customer?.displayName ?? "Guest",
        total: n.totalPriceSet.shopMoney.amount,
        status: n.displayFulfillmentStatus ?? "UNFULFILLED",
        createdAt: n.createdAt,
      })),
      error: null,
    };
  });

/* ---------------------------------- products --------------------------------- */

export interface AdminProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  descriptionHtml: string;
  imageUrl: string | null;
  published: boolean;
  price: string;
  currency: string;
  variantId: string | null;
  variantCount: number;
  adminUrl: string;
}

const PRODUCTS_QUERY = `
  query AdminProducts($first: Int!, $query: String) {
    products(first: $first, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          handle
          status
          descriptionHtml
          onlineStoreUrl
          featuredImage { url }
          priceRangeV2 { minVariantPrice { amount currencyCode } }
          variants(first: 1) { edges { node { id } } }
          variantsCount { count }
        }
      }
    }
  }
`;

export const listAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string } | undefined) => input ?? {})
  .handler(async ({ data: input, context }): Promise<{ products: AdminProduct[]; error: string | null }> => {
    await assertAdmin(context as never);

    const { data, error } = await adminGraphql<{
      products: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            handle: string;
            status: string;
            descriptionHtml: string | null;
            onlineStoreUrl: string | null;
            featuredImage: { url: string } | null;
            priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } };
            variants: { edges: Array<{ node: { id: string } }> };
            variantsCount: { count: number } | null;
          };
        }>;
      };
    }>(PRODUCTS_QUERY, { first: 100, query: input.search ? `title:*${input.search}*` : null });

    if (!data) return { products: [], error };

    return {
      products: data.products.edges.map(({ node }) => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        status: node.status,
        descriptionHtml: node.descriptionHtml ?? "",
        imageUrl: node.featuredImage?.url ?? null,
        published: Boolean(node.onlineStoreUrl),
        price: node.priceRangeV2.minVariantPrice.amount,
        currency: node.priceRangeV2.minVariantPrice.currencyCode,
        variantId: node.variants.edges[0]?.node.id ?? null,
        variantCount: node.variantsCount?.count ?? node.variants.edges.length,
        adminUrl: `https://admin.shopify.com/store/${STORE_HANDLE}/products/${node.id.split("/").pop()}`,
      })),
      error: null,
    };
  });

export const updateAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      title?: string;
      descriptionHtml?: string;
      status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
      price?: string;
      variantId?: string | null;
    }) => input,
  )
  .handler(async ({ data: input, context }): Promise<{ ok: boolean; error: string | null }> => {
    await assertAdmin(context as never);

    const product: Record<string, unknown> = { id: input.id };
    if (input.title !== undefined) product["title"] = input.title;
    if (input.descriptionHtml !== undefined) product["descriptionHtml"] = input.descriptionHtml;
    if (input.status !== undefined) product["status"] = input.status;

    const { data, error } = await adminGraphql<{
      productUpdate: { userErrors: Array<{ message: string }> };
    }>(
      `mutation UpdateProduct($product: ProductUpdateInput!) {
        productUpdate(product: $product) { product { id } userErrors { field message } }
      }`,
      { product },
    );
    if (error) return { ok: false, error };
    const userError = data?.productUpdate?.userErrors?.[0]?.message;
    if (userError) return { ok: false, error: userError };

    if (input.price && input.variantId) {
      const priceResult = await adminGraphql<{
        productVariantsBulkUpdate: { userErrors: Array<{ message: string }> };
      }>(
        `mutation UpdatePrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            userErrors { field message }
          }
        }`,
        { productId: input.id, variants: [{ id: input.variantId, price: input.price }] },
      );
      if (priceResult.error) return { ok: false, error: priceResult.error };
      const priceUserError = priceResult.data?.productVariantsBulkUpdate?.userErrors?.[0]?.message;
      if (priceUserError) return { ok: false, error: priceUserError };
    }

    return { ok: true, error: null };
  });

/* --------------------------------- discounts --------------------------------- */

export interface AdminDiscount {
  id: string;
  title: string;
  code: string;
  status: string;
  value: string;
  startsAt: string;
  endsAt: string | null;
  usageCount: number;
}

const DISCOUNTS_QUERY = `
  query Discounts {
    codeDiscountNodes(first: 50, reverse: true) {
      edges {
        node {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              title
              status
              startsAt
              endsAt
              asyncUsageCount
              codes(first: 1) { edges { node { code } } }
              customerGets {
                value {
                  ... on DiscountPercentage { percentage }
                  ... on DiscountAmount { amount { amount currencyCode } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const listDiscounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ discounts: AdminDiscount[]; error: string | null }> => {
    await assertAdmin(context as never);

    const { data, error } = await adminGraphql<{
      codeDiscountNodes: {
        edges: Array<{
          node: {
            id: string;
            codeDiscount: {
              title?: string;
              status?: string;
              startsAt?: string;
              endsAt?: string | null;
              asyncUsageCount?: number;
              codes?: { edges: Array<{ node: { code: string } }> };
              customerGets?: {
                value: { percentage?: number; amount?: { amount: string; currencyCode: string } };
              };
            };
          };
        }>;
      };
    }>(DISCOUNTS_QUERY);

    if (!data) return { discounts: [], error };

    const discounts = data.codeDiscountNodes.edges
      .filter((e) => e.node.codeDiscount?.title !== undefined)
      .map(({ node }) => {
        const d = node.codeDiscount;
        const value = d.customerGets?.value;
        return {
          id: node.id,
          title: d.title ?? "",
          code: d.codes?.edges[0]?.node.code ?? "",
          status: d.status ?? "ACTIVE",
          value: value?.percentage
            ? `${Math.round(value.percentage * 100)}% off`
            : value?.amount
              ? `${value.amount.currencyCode} ${Number(value.amount.amount).toFixed(2)} off`
              : "—",
          startsAt: d.startsAt ?? "",
          endsAt: d.endsAt ?? null,
          usageCount: d.asyncUsageCount ?? 0,
        } satisfies AdminDiscount;
      });

    return { discounts, error: null };
  });

export const createDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { code: string; kind: "percentage" | "amount"; amount: number; endsAt?: string | null }) => input,
  )
  .handler(async ({ data: input, context }): Promise<{ ok: boolean; error: string | null }> => {
    await assertAdmin(context as never);

    const value =
      input.kind === "percentage"
        ? { percentage: input.amount / 100 }
        : { discountAmount: { amount: input.amount, appliesOnEachItem: false } };

    const { data, error } = await adminGraphql<{
      discountCodeBasicCreate: { userErrors: Array<{ message: string }> };
    }>(
      `mutation CreateDiscount($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          userErrors { field message }
        }
      }`,
      {
        basicCodeDiscount: {
          title: input.code,
          code: input.code,
          startsAt: new Date().toISOString(),
          endsAt: input.endsAt || null,
          customerSelection: { all: true },
          customerGets: { value, items: { all: true } },
          appliesOncePerCustomer: false,
        },
      },
    );

    if (error) return { ok: false, error };
    const userError = data?.discountCodeBasicCreate?.userErrors?.[0]?.message;
    if (userError) return { ok: false, error: userError };
    return { ok: true, error: null };
  });

export const deleteDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data: input, context }): Promise<{ ok: boolean; error: string | null }> => {
    await assertAdmin(context as never);
    const { data, error } = await adminGraphql<{
      discountCodeDelete: { userErrors: Array<{ message: string }> };
    }>(
      `mutation DeleteDiscount($id: ID!) { discountCodeDelete(id: $id) { userErrors { field message } } }`,
      { id: input.id },
    );
    if (error) return { ok: false, error };
    const userError = data?.discountCodeDelete?.userErrors?.[0]?.message;
    if (userError) return { ok: false, error: userError };
    return { ok: true, error: null };
  });
