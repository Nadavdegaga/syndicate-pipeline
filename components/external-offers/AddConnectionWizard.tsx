"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createConnection } from "@/lib/actions/connections";
import {
  PLATFORM_KINDS,
  platformLabel,
  type PlatformKind,
} from "@/lib/platforms/registry";

const PLATFORM_DOCS: Record<PlatformKind, { url: string; defaultBase: string; needsSubdomain?: boolean }> = {
  everflow: { url: "https://developers.everflow.io/", defaultBase: "https://api.eflow.team/v1" },
  cake: { url: "https://cakemarketing.com/api/", defaultBase: "", needsSubdomain: true },
  affise: {
    url: "https://affise.atlassian.net/wiki/spaces/Affise/pages/2785706/3.0+API",
    defaultBase: "",
    needsSubdomain: true,
  },
  tune: { url: "https://developers.tune.com/api/", defaultBase: "" },
  hasoffers: { url: "https://developers.tune.com/api/", defaultBase: "" },
  custom: { url: "", defaultBase: "" },
};

type Step = 1 | 2 | 3 | 4 | 5;

export function AddConnectionWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    platform: "everflow" as PlatformKind,
    display_name: "",
    base_url: PLATFORM_DOCS.everflow.defaultBase,
    api_key: "",
    api_secret: "",
    extra_config_json: "{}",
    sync_frequency_hours: 24 as 12 | 24 | 48,
  });
  const [testResult, setTestResult] = useState<
    | null
    | { ok: true; sample_count: number; sample?: unknown }
    | { ok: false; error: string }
  >(null);
  const [testing, setTesting] = useState(false);
  const [saving, startSaving] = useTransition();

  function reset() {
    setStep(1);
    setForm({
      platform: "everflow",
      display_name: "",
      base_url: PLATFORM_DOCS.everflow.defaultBase,
      api_key: "",
      api_secret: "",
      extra_config_json: "{}",
      sync_frequency_hours: 24,
    });
    setTestResult(null);
    setTesting(false);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function setPlatform(p: PlatformKind) {
    setForm((f) => ({
      ...f,
      platform: p,
      base_url: PLATFORM_DOCS[p].defaultBase,
    }));
  }

  function next() {
    setStep((s) => Math.min(5, s + 1) as Step);
  }
  function back() {
    setStep((s) => Math.max(1, s - 1) as Step);
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      let extra: Record<string, unknown> = {};
      try {
        extra = JSON.parse(form.extra_config_json || "{}");
      } catch {
        toast.error("extra_config is not valid JSON");
        setTesting(false);
        return;
      }
      const r = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          base_url: form.base_url,
          api_key: form.api_key,
          api_secret: form.api_secret || null,
          extra_config: extra,
        }),
      });
      const data = await r.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  }

  function save() {
    startSaving(async () => {
      let extra: Record<string, unknown> = {};
      try {
        extra = JSON.parse(form.extra_config_json || "{}");
      } catch {
        toast.error("extra_config is not valid JSON");
        return;
      }
      const r = await createConnection({
        platform: form.platform,
        display_name: form.display_name,
        base_url: form.base_url,
        api_key: form.api_key,
        api_secret: form.api_secret || undefined,
        extra_config: extra,
        sync_frequency_hours: form.sync_frequency_hours,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Connection saved");
      handleClose(false);
      router.refresh();
    });
  }

  const docs = PLATFORM_DOCS[form.platform];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add platform connection</DialogTitle>
        </DialogHeader>

        <Stepper step={step} />

        <div className="min-h-[260px] py-3">
          {step === 1 && (
            <section className="space-y-3">
              <Label>Platform</Label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORM_KINDS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                      form.platform === p
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {platformLabel(p)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Pick the platform we&apos;ll pull offers from. Three are wired up
                (Everflow, Cake, Affise). The rest are stubs for later.
              </p>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="display_name">Display name *</Label>
                <Input
                  id="display_name"
                  value={form.display_name}
                  onChange={(e) =>
                    setForm({ ...form, display_name: e.target.value })
                  }
                  placeholder={`My ${platformLabel(form.platform)} account`}
                  autoFocus
                />
                <p className="text-xs text-slate-500">
                  Internal label — pick anything that helps you tell connections
                  apart.
                </p>
              </div>
              {docs.url && (
                <a
                  href={docs.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  Open {platformLabel(form.platform)} API docs
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="base_url">API base URL *</Label>
                <Input
                  id="base_url"
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder={
                    docs.needsSubdomain
                      ? `e.g. https://<your-subdomain>.cakemarketing.com/api/1`
                      : `e.g. ${docs.defaultBase}`
                  }
                />
                {docs.needsSubdomain && (
                  <p className="text-[11px] text-amber-600">
                    Replace <code>&lt;your-subdomain&gt;</code> with your tenant.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="api_key">API key *</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  placeholder="Paste your API key (stored encrypted)"
                />
                <p className="text-[11px] text-slate-500">
                  Encrypted with AES-256-GCM before storage.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="api_secret">API secret (optional)</Label>
                <Input
                  id="api_secret"
                  type="password"
                  value={form.api_secret}
                  onChange={(e) =>
                    setForm({ ...form, api_secret: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extra_config">Extra config (JSON)</Label>
                <Textarea
                  id="extra_config"
                  rows={3}
                  value={form.extra_config_json}
                  onChange={(e) =>
                    setForm({ ...form, extra_config_json: e.target.value })
                  }
                  placeholder='{ "any_platform_specific": "settings" }'
                  className="font-mono text-xs"
                />
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <div className="text-sm text-slate-700">
                Hit <strong>Test connection</strong> — we&apos;ll fetch one page of
                offers from {platformLabel(form.platform)} to confirm the
                credentials work.
              </div>
              <Button
                onClick={runTest}
                disabled={testing || !form.api_key}
                className="gap-2"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Test connection
              </Button>
              {testResult && (
                <div
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    testResult.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800",
                  )}
                >
                  {testResult.ok ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-medium">Connection works</div>
                        <div className="mt-0.5 text-xs">
                          Fetched {testResult.sample_count} offers in the sample.
                          {Boolean(testResult.sample) && (
                            <details className="mt-1 cursor-pointer">
                              <summary>Sample offer</summary>
                              <pre className="mt-1 max-h-32 overflow-auto text-[10px]">
                                {JSON.stringify(testResult.sample, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
                      <div>
                        <div className="font-medium">Connection failed</div>
                        <div className="mt-0.5 text-xs">{testResult.error}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {step === 5 && (
            <section className="space-y-4">
              <div className="space-y-1.5">
                <Label>Sync frequency</Label>
                <Select
                  value={String(form.sync_frequency_hours)}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      sync_frequency_hours: parseInt(v, 10) as 12 | 24 | 48,
                    })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">Every 12 hours</SelectItem>
                    <SelectItem value="24">Every 24 hours</SelectItem>
                    <SelectItem value="48">Every 48 hours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Vercel Cron runs every 6h and picks up connections that are
                  due. You can always sync manually from the connection card.
                </p>
              </div>
              <Separator />
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <div className="font-semibold text-slate-700">Summary</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <dt className="text-slate-500">Platform</dt>
                  <dd>{platformLabel(form.platform)}</dd>
                  <dt className="text-slate-500">Display name</dt>
                  <dd>{form.display_name || "—"}</dd>
                  <dt className="text-slate-500">Base URL</dt>
                  <dd className="truncate">{form.base_url || "—"}</dd>
                  <dt className="text-slate-500">API key</dt>
                  <dd>{form.api_key ? "•••• (encrypted)" : "—"}</dd>
                  <dt className="text-slate-500">Frequency</dt>
                  <dd>Every {form.sync_frequency_hours}h</dd>
                </dl>
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <Button variant="ghost" onClick={back} disabled={step === 1 || saving}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < 5 ? (
            <Button
              onClick={next}
              disabled={
                (step === 2 && !form.display_name.trim()) ||
                (step === 3 && (!form.base_url.trim() || !form.api_key.trim()))
              }
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save connection
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Platform", "Display", "Credentials", "Test", "Save"];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {labels.map((lbl, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;
        return (
          <li key={lbl} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] tabular-nums",
                done && "bg-emerald-100 text-emerald-700",
                active && "bg-slate-900 text-white",
                !done && !active && "bg-slate-100 text-slate-500",
              )}
            >
              {done ? <CheckCircle2 className="h-3 w-3" /> : num}
            </span>
            <span
              className={cn(
                "uppercase tracking-wider",
                active ? "text-slate-900" : done ? "text-emerald-700" : "text-slate-400",
              )}
            >
              {lbl}
            </span>
            {num < labels.length && (
              <ChevronRight className="h-3 w-3 text-slate-300" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
