"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { createNetwork } from "@/lib/actions/networks";

export function AddNetworkForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: params.get("name") ?? "",
    tier: "" as "" | "A" | "B" | "C",
    login_url: "",
    registration_url: "",
    linkedin_url: params.get("linkedin_url") ?? "",
    registered: "" as "" | "true" | "false",
    notes: params.get("notes") ?? "",
  });
  const sourceOfferId = params.get("from_offer");

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
      const r = await createNetwork({
        name: form.name,
        tier: form.tier || null,
        login_url: form.login_url || undefined,
        registration_url: form.registration_url || undefined,
        linkedin_url: form.linkedin_url || undefined,
        registered:
          form.registered === "true"
            ? true
            : form.registered === "false"
              ? false
              : null,
        notes: form.notes || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Added ${form.name}`);
      router.push(sourceOfferId ? `/offers/${sourceOfferId}` : "/networks");
      router.refresh();
    });
  }

  return (
    <FormShell
      title="New network"
      subtitle={
        sourceOfferId
          ? "Pre-filled from the offer detail page. You'll go back to that offer after saving."
          : "Required field: Name (must be unique)."
      }
      backHref={sourceOfferId ? `/offers/${sourceOfferId}` : "/networks"}
      backLabel={sourceOfferId ? "Back to offer" : "Back to networks"}
      pending={pending}
      onSubmit={submit}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            autoFocus
            placeholder="e.g. Madrivo, DMS, QuinStreet"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tier">Tier</Label>
          <Select
            value={form.tier || "__none__"}
            onValueChange={(v) =>
              update("tier", v === "__none__" ? "" : (v as "A" | "B" | "C"))
            }
          >
            <SelectTrigger id="tier">
              <SelectValue placeholder="Untiered" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Untiered</SelectItem>
              <SelectItem value="A">A — top strategic</SelectItem>
              <SelectItem value="B">B — proven partner</SelectItem>
              <SelectItem value="C">C — opportunistic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <Separator />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="login_url">Login URL</Label>
          <Input
            id="login_url"
            type="url"
            value={form.login_url}
            onChange={(e) => update("login_url", e.target.value)}
            placeholder="https://network.example.com/login"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration_url">Registration URL</Label>
          <Input
            id="registration_url"
            type="url"
            value={form.registration_url}
            onChange={(e) => update("registration_url", e.target.value)}
            placeholder="https://network.example.com/signup"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input
            id="linkedin_url"
            type="url"
            value={form.linkedin_url}
            onChange={(e) => update("linkedin_url", e.target.value)}
            placeholder="https://linkedin.com/company/..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registered">Registered</Label>
          <Select
            value={form.registered || "__unknown__"}
            onValueChange={(v) =>
              update(
                "registered",
                v === "__unknown__" ? "" : (v as "true" | "false"),
              )
            }
          >
            <SelectTrigger id="registered">
              <SelectValue placeholder="Unknown" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unknown__">Unknown</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
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
          placeholder="Anything relevant about this network..."
        />
      </section>
    </FormShell>
  );
}
