"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
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
import { createContact } from "@/lib/actions/contacts";
import {
  isTourCompleted,
  startAddContactTour,
} from "@/lib/tour";
import { COMMON_CONTACT_STATUSES } from "@/lib/utils/status";

const CHANNELS = ["LinkedIn", "Telegram", "Teams", "Skype", "Email", "Unknown"];

export function AddContactForm({
  networks,
}: {
  networks: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    role: "",
    company: "",
    network_id: "",
    channel: "Unknown",
    email: "",
    linkedin_url: "",
    telegram: "",
    status_nomi: "",
    status_startech: "",
    status_luminarix: "",
    notes: "",
  });

  // Auto-fire the Add Contact tour on first visit
  useEffect(() => {
    if (isTourCompleted("addContact")) return;
    const t = setTimeout(() => startAddContactTour(), 400);
    return () => clearTimeout(t);
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      const r = await createContact({
        name: form.name,
        role: form.role || undefined,
        company: form.company || undefined,
        network_id: form.network_id || undefined,
        channel: form.channel || undefined,
        email: form.email || undefined,
        linkedin_url: form.linkedin_url || undefined,
        telegram: form.telegram || undefined,
        notes: form.notes || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }

      // Apply brand statuses via field updates if provided (createContact doesn't take them).
      const statusUpdates: Array<[string, string]> = [];
      if (form.status_nomi) statusUpdates.push(["status_nomi", form.status_nomi]);
      if (form.status_startech)
        statusUpdates.push(["status_startech", form.status_startech]);
      if (form.status_luminarix)
        statusUpdates.push(["status_luminarix", form.status_luminarix]);
      if (statusUpdates.length && r.data?.id) {
        const { updateContactField } = await import("@/lib/actions/contacts");
        for (const [field, value] of statusUpdates) {
          await updateContactField(
            r.data.id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            field as any,
            value,
          );
        }
      }

      toast.success(`Added ${form.name}`);
      router.push("/contacts");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to contacts
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={submit}>
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <UserPlus className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  New contact
                </h2>
                <p className="text-xs text-slate-500">
                  Required fields: Name. Everything else can be filled later.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <section
              data-tour="add-contact-name"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                  autoFocus
                  placeholder="e.g. Suki Zhong"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  placeholder="Affiliate Manager"
                />
              </div>
            </section>

            <Separator />

            <section
              data-tour="add-contact-network"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  list="company-list"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="Madrivo, DMS, etc."
                />
                <datalist id="company-list">
                  {networks.map((n) => (
                    <option key={n.id} value={n.name} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="network">Network (optional, linked)</Label>
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
                <Label htmlFor="channel">Channel</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) => update("channel", v)}
                >
                  <SelectTrigger id="channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={form.linkedin_url}
                  onChange={(e) => update("linkedin_url", e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telegram">Telegram</Label>
                <Input
                  id="telegram"
                  value={form.telegram}
                  onChange={(e) => update("telegram", e.target.value)}
                  placeholder="@handle"
                />
              </div>
            </section>

            <Separator />

            <section
              data-tour="add-contact-brands"
              className="space-y-3"
            >
              <h3 className="text-[11px] uppercase tracking-wider text-slate-500">
                Brand statuses (independent per brand)
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="status_nomi">Nomi</Label>
                  <Input
                    id="status_nomi"
                    list="status-suggestions"
                    value={form.status_nomi}
                    onChange={(e) => update("status_nomi", e.target.value)}
                    placeholder="Pending, Sent, LD…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status_startech">StarTech</Label>
                  <Input
                    id="status_startech"
                    list="status-suggestions"
                    value={form.status_startech}
                    onChange={(e) => update("status_startech", e.target.value)}
                    placeholder="Pending, Sent, LD…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status_luminarix">Luminarix</Label>
                  <Input
                    id="status_luminarix"
                    list="status-suggestions"
                    value={form.status_luminarix}
                    onChange={(e) => update("status_luminarix", e.target.value)}
                    placeholder="Pending, Sent, LD…"
                  />
                </div>
              </div>
              <datalist id="status-suggestions">
                {COMMON_CONTACT_STATUSES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </section>

            <Separator />

            <section className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Anything you want to remember about this person…"
                rows={3}
              />
            </section>
          </div>

          <div
            data-tour="add-contact-submit"
            className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"
          >
            <Button asChild variant="ghost" type="button" disabled={pending}>
              <Link href="/contacts">Cancel</Link>
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save contact
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
