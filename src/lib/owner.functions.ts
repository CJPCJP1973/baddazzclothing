import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * One-time owner bootstrap. Requires the out-of-band ADMIN_SETUP_TOKEN secret,
 * so a random visitor who signs up can never claim the admin role.
 */
export const claimOwnerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { setupToken?: string }) => ({
    setupToken: typeof data?.setupToken === "string" ? data.setupToken.trim() : "",
  }))
  .handler(async ({ data, context }) => {
    const expected = process.env["ADMIN_SETUP_TOKEN"];
    if (!expected) return { ok: false as const, reason: "not_configured" as const };
    if (!data.setupToken || data.setupToken !== expected) {
      return { ok: false as const, reason: "invalid_token" as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);
    if (existingError) return { ok: false as const, reason: "failed" as const };

    if (existing && existing.length > 0) {
      const isSelf = existing.some((row) => row.user_id === context.userId);
      return isSelf
        ? { ok: true as const }
        : { ok: false as const, reason: "already_claimed" as const };
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) return { ok: false as const, reason: "failed" as const };

    return { ok: true as const };
  });
