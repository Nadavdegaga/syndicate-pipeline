"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Radio,
  Briefcase,
  Handshake,
  TrendingUp,
  Loader2,
  ArrowRight,
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
import { createContact } from "@/lib/actions/contacts";
import { createNetwork } from "@/lib/actions/networks";
import { createOffer } from "@/lib/actions/offers";
import { createWishlist } from "@/lib/actions/wishlists";
import { createDemand } from "@/lib/actions/demand";

type EntityKind = "contact" | "network" | "offer" | "wishlist" | "demand";

const ACTIONS: { kind: EntityKind; label: string; icon: typeof UserPlus; bg: string; iconColor: string }[] = [
  { kind: "contact", label: "Add Contact", icon: UserPlus, bg: "bg-blue-50", iconColor: "text-blue-600" },
  { kind: "network", label: "Add Network", icon: Radio, bg: "bg-amber-50", iconColor: "text-amber-600" },
  { kind: "offer", label: "Add Offer", icon: Briefcase, bg: "bg-violet-50", iconColor: "text-violet-600" },
  { kind: "wishlist", label: "Add Wishlist", icon: Handshake, bg: "bg-emerald-50", iconColor: "text-emerald-600" },
  { kind: "demand", label: "Add Demand", icon: TrendingUp, bg: "bg-rose-50", iconColor: "text-rose-600" },
];

const ENTITY_PATH: Record<EntityKind, string> = {
  contact: "/contacts",
  network: "/networks",
  offer: "/offers",
  wishlist: "/wishlists",
  demand: "/demand",
};

export function QuickActions({
  networks,
  contacts,
}: {
  networks: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState<EntityKind | null>(null);
  const [created, setCreated] = useState<{ kind: EntityKind; id: string } | null>(null);

  return (
    <>
      <div data-tour="quick-actions" className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          ⚡ Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.kind}
                onClick={() => {
                  setCreated(null);
                  setOpen(a.kind);
                }}
                className="group flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-transform group-hover:scale-110",
                    a.bg,
                  )}
                >
                  <Icon className={cn("h-4 w-4", a.iconColor)} />
                </span>
                <span className="truncate">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* One dialog reused, switching forms by kind */}
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {open ? ACTIONS.find((a) => a.kind === open)?.label : ""}
            </DialogTitle>
          </DialogHeader>
          {open === "contact" && (
            <ContactForm
              networks={networks}
              onSuccess={(id) => {
                setCreated({ kind: "contact", id });
                setOpen(null);
              }}
            />
          )}
          {open === "network" && (
            <NetworkForm
              onSuccess={(id) => {
                setCreated({ kind: "network", id });
                setOpen(null);
              }}
            />
          )}
          {open === "offer" && (
            <OfferForm
              networks={networks}
              onSuccess={(id) => {
                setCreated({ kind: "offer", id });
                setOpen(null);
              }}
            />
          )}
          {open === "wishlist" && (
            <WishlistForm
              contacts={contacts}
              onSuccess={(id) => {
                setCreated({ kind: "wishlist", id });
                setOpen(null);
              }}
            />
          )}
          {open === "demand" && (
            <DemandForm
              networks={networks}
              onSuccess={(id) => {
                setCreated({ kind: "demand", id });
                setOpen(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Toast-attached "Open it" link when something was created */}
      {created && (
        <CreatedToast
          kind={created.kind}
          id={created.id}
          onSeen={() => setCreated(null)}
        />
      )}
    </>
  );
}

function CreatedToast({
  kind,
  id,
  onSeen,
}: {
  kind: EntityKind;
  id: string;
  onSeen: () => void;
}) {
  const router = useRouter();
  // Fire once on mount
  useState(() => {
    const href =
      kind === "contact"
        ? `/contacts?id=${id}`
        : kind === "network"
          ? `/networks/${id}`
          : kind === "offer"
            ? `/offers/${id}`
            : ENTITY_PATH[kind];
    toast.success(`Added! `, {
      action: {
        label: "Open it",
        onClick: () => router.push(href),
      },
    });
    onSeen();
    router.refresh();
    return 0;
  });
  return null;
}

// ===== Inline modal forms (compact versions of the /new pages) =====

function ContactForm({
  networks,
  onSuccess,
}: {
  networks: { id: string; name: string }[];
  onSuccess: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    role: "",
    company: "",
    network_id: "",
    channel: "Unknown",
    email: "",
  });

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
        channel: form.channel,
        email: form.email || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSuccess(r.data!.id);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <FieldRow label="Name *" required>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          autoFocus
        />
      </FieldRow>
      <FieldRow label="Role">
        <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
      </FieldRow>
      <FieldRow label="Company">
        <Input
          list="qa-networks"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
        <datalist id="qa-networks">
          {networks.map((n) => (
            <option key={n.id} value={n.name} />
          ))}
        </datalist>
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Channel">
          <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["LinkedIn", "Telegram", "Teams", "Skype", "Email", "Unknown"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </FieldRow>
      </div>
      <DialogActions pending={pending} />
    </form>
  );
}

function NetworkForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", tier: "" as "" | "A" | "B" | "C", notes: "" });
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
        notes: form.notes || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSuccess(r.id);
    });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <FieldRow label="Name *" required>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
      </FieldRow>
      <FieldRow label="Tier">
        <Select
          value={form.tier || "__none__"}
          onValueChange={(v) => setForm({ ...form, tier: v === "__none__" ? "" : (v as "A" | "B" | "C") })}
        >
          <SelectTrigger><SelectValue placeholder="Untiered" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Untiered</SelectItem>
            <SelectItem value="A">A</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="C">C</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Notes">
        <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </FieldRow>
      <DialogActions pending={pending} />
    </form>
  );
}

function OfferForm({
  networks,
  onSuccess,
}: {
  networks: { id: string; name: string }[];
  onSuccess: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", network_id: "", vertical: "", payout: "" });
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
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSuccess(r.id);
    });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <FieldRow label="Offer name *" required>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
      </FieldRow>
      <FieldRow label="Network">
        <Select
          value={form.network_id || "__none__"}
          onValueChange={(v) => setForm({ ...form, network_id: v === "__none__" ? "" : v })}
        >
          <SelectTrigger><SelectValue placeholder="Pick a network…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No network linked</SelectItem>
            {networks.map((n) => (
              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Vertical">
          <Input value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })} />
        </FieldRow>
        <FieldRow label="Payout">
          <Input value={form.payout} onChange={(e) => setForm({ ...form, payout: e.target.value })} placeholder="$8 CPL" />
        </FieldRow>
      </div>
      <DialogActions pending={pending} />
    </form>
  );
}

function WishlistForm({
  contacts,
  onSuccess,
}: {
  contacts: { id: string; name: string }[];
  onSuccess: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    publisher_name: "",
    publisher_contact_id: "",
    requested_offer: "",
    vertical: "",
  });
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
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSuccess(r.id);
    });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <FieldRow label="Publisher name">
        <Input value={form.publisher_name} onChange={(e) => setForm({ ...form, publisher_name: e.target.value })} autoFocus />
      </FieldRow>
      <FieldRow label="Linked contact (optional)">
        <Select
          value={form.publisher_contact_id || "__none__"}
          onValueChange={(v) => setForm({ ...form, publisher_contact_id: v === "__none__" ? "" : v })}
        >
          <SelectTrigger><SelectValue placeholder="No linked contact" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No linked contact</SelectItem>
            {contacts.slice(0, 200).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Requested offer *" required>
        <Input
          value={form.requested_offer}
          onChange={(e) => setForm({ ...form, requested_offer: e.target.value })}
          required
        />
      </FieldRow>
      <FieldRow label="Vertical">
        <Input value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })} />
      </FieldRow>
      <DialogActions pending={pending} />
    </form>
  );
}

function DemandForm({
  networks,
  onSuccess,
}: {
  networks: { id: string; name: string }[];
  onSuccess: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ offer_name: "", network_id: "", vertical: "", payout: "" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.offer_name.trim()) {
      toast.error("Offer name is required");
      return;
    }
    startTransition(async () => {
      const r = await createDemand({
        offer_name: form.offer_name,
        network_id: form.network_id || null,
        vertical: form.vertical || undefined,
        payout: form.payout || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSuccess(r.id);
    });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <FieldRow label="Offer name *" required>
        <Input value={form.offer_name} onChange={(e) => setForm({ ...form, offer_name: e.target.value })} required autoFocus />
      </FieldRow>
      <FieldRow label="Network">
        <Select
          value={form.network_id || "__none__"}
          onValueChange={(v) => setForm({ ...form, network_id: v === "__none__" ? "" : v })}
        >
          <SelectTrigger><SelectValue placeholder="Pick a network…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No network linked</SelectItem>
            {networks.map((n) => (
              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Vertical">
          <Input value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value })} />
        </FieldRow>
        <FieldRow label="Payout">
          <Input value={form.payout} onChange={(e) => setForm({ ...form, payout: e.target.value })} placeholder="$8 CPL" />
        </FieldRow>
      </div>
      <DialogActions pending={pending} />
    </form>
  );
}

// ===== shared bits =====

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function DialogActions({ pending }: { pending: boolean }) {
  return (
    <>
      <Separator />
      <DialogFooter className="gap-2">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
          {!pending && <ArrowRight className="h-4 w-4" />}
        </Button>
      </DialogFooter>
    </>
  );
}

// Cheap re-exports so the Insights page can render a header-level CTA
export function QuickActionsHeader() {
  return (
    <p className="text-xs text-slate-500">
      One-click create — opens an inline form, no page change.{" "}
      <Link href="/contacts/new" className="underline">
        Or use the full form
      </Link>
      .
    </p>
  );
}
