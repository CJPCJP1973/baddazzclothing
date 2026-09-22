import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { claimOwnerAccess } from "@/lib/owner.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Owner sign in | Baddazz Clothing" },
      { name: "description", content: "Private sign in for the Baddazz Clothing order dashboard." },
      { property: "og:title", content: "Owner sign in | Baddazz Clothing" },
      { property: "og:description", content: "Private sign in for the Baddazz Clothing order dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const claimOwner = useServerFn(claimOwnerAccess);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      if (setupToken.trim()) {
        const result = await claimOwner({ data: { setupToken: setupToken.trim() } });
        if (!result.ok) {
          toast.error(
            result.reason === "invalid_token"
              ? "That owner setup code isn't right."
              : result.reason === "already_claimed"
                ? "Owner access has already been set up for another account."
                : "Couldn't set up owner access. Try again.",
          );
        }
      }

      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-display text-4xl tracking-wide uppercase">Owner access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage orders. This area is private to the store owner.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-xs tracking-widest text-muted-foreground uppercase">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs tracking-widest text-muted-foreground uppercase">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="setupToken" className="text-xs tracking-widest text-muted-foreground uppercase">
              Owner setup code (first time only)
            </label>
            <input
              id="setupToken"
              type="password"
              autoComplete="off"
              value={setupToken}
              onChange={(e) => setSetupToken(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Leave blank unless you are setting up owner access for the first time.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-primary px-4 py-2.5 text-xs font-semibold tracking-widest text-primary-foreground uppercase disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-xs tracking-widest text-muted-foreground uppercase hover:text-foreground"
        >
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}
