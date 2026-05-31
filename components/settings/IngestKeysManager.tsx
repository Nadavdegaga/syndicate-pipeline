"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Loader2,
  Copy,
  CheckCircle2,
  Trash2,
  Key,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  generateIngestKey,
  revokeIngestKey,
} from "@/lib/actions/ingest-keys";
import { relativeOrDash } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

export type IngestKeyRow = {
  id: string;
  label: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export function IngestKeysManager({
  initialKeys,
}: {
  initialKeys: IngestKeyRow[];
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [genOpen, setGenOpen] = useState(false);
  const [label, setLabel] = useState("Affise daily stats");
  const [generated, setGenerated] = useState<{ plaintext: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function startGenerate() {
    setGenerated(null);
    setLabel("Affise daily stats");
    setGenOpen(true);
  }

  function doGenerate() {
    startTransition(async () => {
      const r = await generateIngestKey(label, ["affise"]);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setGenerated({ plaintext: r.plaintext });
      setKeys((ks) => [
        {
          id: r.id,
          label,
          scopes: ["affise"],
          created_at: new Date().toISOString(),
          last_used_at: null,
          revoked_at: null,
        },
        ...ks,
      ]);
    });
  }

  function copyKey(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Key copied to clipboard");
  }

  function revoke(id: string) {
    if (!confirm("Revoke this key? Any service using it will start failing.")) return;
    startTransition(async () => {
      const r = await revokeIngestKey(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setKeys((ks) =>
        ks.map((k) =>
          k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k,
        ),
      );
      toast.success("Key revoked");
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          API ingest keys
        </h3>
        <Button onClick={startGenerate} className="gap-2">
          <Plus className="h-4 w-4" /> Generate key
        </Button>
      </div>

      {keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Key className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-900">No keys yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Generate a key to authorize the Affise ingest endpoint.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {keys.map((k) => (
            <li
              key={k.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3",
                k.revoked_at && "bg-slate-50/60 opacity-70",
              )}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
                <Key className="h-4 w-4 text-slate-600" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {k.label}
                  </span>
                  {k.revoked_at && (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-red-700 ring-1 ring-inset ring-red-200">
                      Revoked
                    </span>
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    scopes: {k.scopes.join(", ") || "—"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Created {relativeOrDash(k.created_at)} ·{" "}
                  Last used {relativeOrDash(k.last_used_at)}
                </div>
              </div>
              {!k.revoked_at && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revoke(k.id)}
                  disabled={pending}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Generate dialog */}
      <Dialog open={genOpen} onOpenChange={(o) => !o && setGenOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {generated ? "Save this key now" : "Generate a new API key"}
            </DialogTitle>
          </DialogHeader>

          {!generated ? (
            <>
              <div className="space-y-2 py-2">
                <Label htmlFor="kl">Label</Label>
                <Input
                  id="kl"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Affise nightly job"
                  autoFocus
                />
                <p className="text-xs text-slate-500">
                  We only store the SHA-256 hash. The plaintext is shown once on
                  the next screen.
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setGenOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={doGenerate} disabled={pending || !label.trim()}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3 py-2">
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Save this key now — you will not see it again. We only store
                    its hash.
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label>Plaintext key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md bg-slate-900 px-3 py-2 font-mono text-xs text-white">
                      {generated.plaintext}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyKey(generated.plaintext)}
                      className="gap-1.5"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1 text-xs text-slate-600">
                  <p className="font-medium">How to use it</p>
                  <p>
                    Send a POST to{" "}
                    <code className="rounded bg-slate-100 px-1 text-[11px]">
                      /api/ingest/affise
                    </code>{" "}
                    with header{" "}
                    <code className="rounded bg-slate-100 px-1 text-[11px]">
                      X-API-Key: {generated.plaintext.slice(0, 16)}…
                    </code>
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setGenOpen(false);
                    setGenerated(null);
                  }}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
