const MESSAGES: Record<string, string> = {
  missing_token: "Your Shopify access hasn't been saved yet, so there's nothing to show here.",
  unauthorized: "Shopify refused the request. Reconnect the store or check the access token.",
  scope: "Shopify hasn't granted this app permission for that. Add the missing permission in your Shopify admin.",
};

export function AdminError({ error }: { error: string }) {
  return (
    <p className="mt-8 rounded border border-destructive/40 bg-card p-6 text-sm text-muted-foreground">
      {MESSAGES[error] ?? `Something went wrong: ${error}`}
    </p>
  );
}
