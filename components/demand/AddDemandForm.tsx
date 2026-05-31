"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { FormShell } from "@/components/shared/FormShell";
import { createDemand } from "@/lib/actions/demand";

export function AddDemandForm({
  networks,
}: {
  networks: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    network_id: "",
    offer_name: "",
    vertical: "",
    link: "",
    payout: "",
    status: "open" as "open" | "covered" | "paused",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.offer_name.trim()) {
      toast.error("Offer name is required");
      return;
    }
    startTransition(async () => {
      const r = await createDemand({
        network_id: form.network_id || null,
        offer_name: form.offer_name,
        vertical: form.vertical || undefined,
        link: form.link || undefined,
        payout: form.payout || undefined,
        status: form.status,
        notes: form.notes || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Demand item added");
      router.push("/demand");
      router.refresh();
    });
  }

  return (
    <FormShell
      title="New demand item"
      subtitle="Something a network has told us they need traffic for. Required: offer name."
      backHref="/demand"
      backLabel="Back to demand"
      pending={pending}
      onSubmit={submit}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="offer_name">Offer name *</Label>
          <Input
            id="offer_name"
            value={form.offer_name}
            onChange={(e) => update("offer_name", e.target.value)}
            required
            autoFocus
            placeholder="What does the network need? e.g. 'Solar leads CA'"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="network">Network</Label>
          <Select
            value={form.network_id || "__none__"}
            onValueChange={(v) =>
              update("network_id", v === "__none__" ? "" : v)
            }
          >
            <SelectTrigger id="network">
              <SelectValue placeholder="Pick a network…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-slate-400">No network linked</span>
              </SelectItem>
              {networks.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              update("status", v as "open" | "covered" | "paused")
            }
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="covered">Covered</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <Separator />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vertical">Vertical</Label>
          <Input
            id="vertical"
            value={form.vertical}
            onChange={(e) => update("vertical", e.target.value)}
            placeholder="Auto, Home, Solar…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payout">Payout</Label>
          <Input
            id="payout"
            value={form.payout}
            onChange={(e) => update("payout", e.target.value)}
            placeholder="$8 CPL · 30% RevShare"
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="link">Link</Label>
          <Input
            id="link"
            type="url"
            value={form.link}
            onChange={(e) => update("link", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          placeholder="Context for this demand…"
        />
      </section>
    </FormShell>
  );
}
