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
import { createOffer } from "@/lib/actions/offers";

const STATUSES = [
  "active",
  "needs_proof",
  "needs_traffic",
  "direct",
  "internal",
  "paused",
  "dead",
];

export function AddOfferForm({
  networks,
}: {
  networks: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    network_id: "",
    vertical: "",
    payout: "",
    traffic_sources: "",
    preview_link: "",
    status: "active",
    kpi_notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Offer name is required");
      return;
    }
    startTransition(async () => {
      const r = await createOffer({
        name: form.name,
        network_id: form.network_id || null,
        vertical: form.vertical || undefined,
        payout: form.payout || undefined,
        traffic_sources: form.traffic_sources || undefined,
        preview_link: form.preview_link || undefined,
        status: form.status || undefined,
        kpi_notes: form.kpi_notes || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Added ${form.name}`);
      router.push("/offers");
      router.refresh();
    });
  }

  return (
    <FormShell
      title="New offer"
      subtitle="Required: name. Linking a network is recommended so the offer counts toward that network's stats."
      backHref="/offers"
      backLabel="Back to offers"
      pending={pending}
      onSubmit={submit}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="name">Offer name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            autoFocus
            placeholder="e.g. Auto Insurance Today - CPL"
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
          <Select value={form.status} onValueChange={(v) => update("status", v)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
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
            placeholder="Auto insurance, Home, Solar…"
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
          <Label htmlFor="traffic_sources">Traffic sources</Label>
          <Input
            id="traffic_sources"
            value={form.traffic_sources}
            onChange={(e) => update("traffic_sources", e.target.value)}
            placeholder="Search, Native, Social, Email…"
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="preview_link">Preview link</Label>
          <Input
            id="preview_link"
            type="url"
            value={form.preview_link}
            onChange={(e) => update("preview_link", e.target.value)}
            placeholder="https://network.example.com/offer/123"
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-1.5">
        <Label htmlFor="kpi_notes">KPI notes</Label>
        <Textarea
          id="kpi_notes"
          value={form.kpi_notes}
          onChange={(e) => update("kpi_notes", e.target.value)}
          rows={3}
          placeholder="Conversion windows, exclusions, restrictions…"
        />
      </section>
    </FormShell>
  );
}
