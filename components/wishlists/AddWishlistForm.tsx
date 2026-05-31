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
import { createWishlist } from "@/lib/actions/wishlists";

export function AddWishlistForm({
  contacts,
}: {
  contacts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    publisher_name: "",
    publisher_contact_id: "",
    requested_offer: "",
    vertical: "",
    link_or_network: "",
    status: "open" as "open" | "matched" | "delivered" | "declined",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.requested_offer.trim()) {
      toast.error("Requested offer is required");
      return;
    }
    startTransition(async () => {
      const r = await createWishlist({
        publisher_name: form.publisher_name || undefined,
        publisher_contact_id: form.publisher_contact_id || null,
        requested_offer: form.requested_offer,
        vertical: form.vertical || undefined,
        link_or_network: form.link_or_network || undefined,
        status: form.status,
        notes: form.notes || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Wishlist added");
      router.push("/wishlists");
      router.refresh();
    });
  }

  return (
    <FormShell
      title="New publisher wishlist"
      subtitle="A publisher's request for something to promote. Required: requested offer."
      backHref="/wishlists"
      backLabel="Back to wishlists"
      pending={pending}
      onSubmit={submit}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="publisher_name">Publisher name</Label>
          <Input
            id="publisher_name"
            value={form.publisher_name}
            onChange={(e) => update("publisher_name", e.target.value)}
            placeholder="e.g. Elle Marketing"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="publisher_contact_id">Linked contact (optional)</Label>
          <Select
            value={form.publisher_contact_id || "__none__"}
            onValueChange={(v) =>
              update("publisher_contact_id", v === "__none__" ? "" : v)
            }
          >
            <SelectTrigger id="publisher_contact_id">
              <SelectValue placeholder="Pick a contact…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-slate-400">No linked contact</span>
              </SelectItem>
              {contacts.slice(0, 500).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <Separator />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="requested_offer">Requested offer *</Label>
          <Input
            id="requested_offer"
            value={form.requested_offer}
            onChange={(e) => update("requested_offer", e.target.value)}
            required
            autoFocus
            placeholder="What did they ask for? e.g. 'Auto insurance CPL US'"
          />
        </div>
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
          <Label htmlFor="status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              update(
                "status",
                v as "open" | "matched" | "delivered" | "declined",
              )
            }
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="link_or_network">Link / Network mentioned</Label>
          <Input
            id="link_or_network"
            value={form.link_or_network}
            onChange={(e) => update("link_or_network", e.target.value)}
            placeholder="Any URL or network name they referenced"
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
          placeholder="Context for this ask…"
        />
      </section>
    </FormShell>
  );
}
