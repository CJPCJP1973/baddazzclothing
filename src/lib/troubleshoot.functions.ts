import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  appName: z.string().max(200).optional(),
  issue: z.string().min(10).max(4000),
});

const Diagnosis = z.object({
  summary: z.string(),
  likelyCauses: z.array(z.object({ cause: z.string(), why: z.string() })),
  nextSteps: z.array(z.string()),
  whenToContactSupport: z.string(),
});

export type TroubleshootResult = { diagnosis: z.infer<typeof Diagnosis> | null; error: string | null };

const SYSTEM = `You are a Shopify support specialist helping the owner of "Baddazz Clothing", a women's streetwear store on Shopify with a custom headless storefront (Shopify Storefront API checkout) and print-on-demand fulfilment via Ninja POD (DTF printing, ships 2-4 business days, US & Canada).
The owner describes a problem with an installed app or integration. Explain the most likely causes (ranked, most likely first, 2-5 items) and concrete next steps a non-technical store owner can take in the Shopify admin or the app itself (3-7 steps). Use plain language, no code. Be honest when something needs the app's own support team.`;

export const troubleshootIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<TroubleshootResult> => {
    const { data: role } = await (context as any).supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", (context as any).userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { diagnosis: null, error: "The AI assistant isn't configured yet." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    try {
      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
        system: SYSTEM,
        prompt: `App or integration: ${data.appName || "Not specified"}\n\nProblem:\n${data.issue}`,
        output: Output.object({ schema: Diagnosis }),
        maxRetries: 1,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      return { diagnosis: await result.output, error: null };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.cause?.statusCode;
      if (status === 429) return { diagnosis: null, error: "The assistant is busy right now. Please try again in a minute." };
      if (status === 402) return { diagnosis: null, error: "Your workspace is out of AI credits. Add credits in workspace billing to keep using the assistant." };
      if (status === 403) return { diagnosis: null, error: "AI use is currently blocked for this workspace. A workspace admin can check the AI settings or spending limit." };
      console.error("troubleshoot failed", e);
      return { diagnosis: null, error: "The assistant couldn't answer that. Please try again." };
    }
  });
