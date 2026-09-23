import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { troubleshootIntegration, type TroubleshootResult } from "@/lib/troubleshoot.functions";

export function AppTroubleshooter({ appNames }: { appNames: string[] }) {
  const run = useServerFn(troubleshootIntegration);
  const [appName, setAppName] = useState("");
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TroubleshootResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (issue.trim().length < 10 || loading) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await run({ data: { appName, issue } }));
    } catch {
      setResult({ diagnosis: null, error: "Something went wrong. Please sign in again and retry." });
    } finally {
      setLoading(false);
    }
  }

  const d = result?.diagnosis;

  return (
    <section className="mt-10 rounded border border-border bg-card p-5">
      <h3 className="font-display text-2xl tracking-wide uppercase">Troubleshoot an app</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe what's going wrong and the AI assistant will suggest likely causes and what to do next.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <select
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Which app? (optional)</option>
          {appNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
          <option value="Other / general integration">Other / general integration</option>
        </select>
        <textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="e.g. New orders aren't showing up in Ninja POD, they just stay unfulfilled in Shopify."
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || issue.trim().length < 10}
          className="rounded bg-primary px-4 py-2 text-xs font-semibold tracking-widest text-primary-foreground uppercase disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Get help"}
        </button>
      </form>

      {result?.error && (
        <p className="mt-4 rounded border border-destructive/40 p-4 text-sm text-muted-foreground">{result.error}</p>
      )}

      {d && (
        <div className="mt-6 space-y-5 text-sm">
          <p>{d.summary}</p>
          <div>
            <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Likely causes</h4>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              {d.likelyCauses.map((c, i) => (
                <li key={i}><span className="font-semibold">{c.cause}</span> — <span className="text-muted-foreground">{c.why}</span></li>
              ))}
            </ol>
          </div>
          <div>
            <h4 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">What to do next</h4>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {d.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
          <p className="text-muted-foreground"><span className="font-semibold text-foreground">When to contact support:</span> {d.whenToContactSupport}</p>
        </div>
      )}
    </section>
  );
}
