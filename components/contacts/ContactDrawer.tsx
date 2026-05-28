"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Copy,
  Mail,
  Send,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditableText } from "@/components/shared/EditableText";
import { DateQuickPick } from "@/components/shared/DateQuickPick";
import { ActivityTimeline, type ActivityRow } from "@/components/shared/ActivityTimeline";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ChannelIcon } from "@/components/shared/ChannelIcon";
import { useBrand } from "@/hooks/useBrand";
import {
  updateContactField,
  getContactActivity,
} from "@/lib/actions/contacts";
import { COMMON_CONTACT_STATUSES } from "@/lib/utils/status";
import { BRAND_LABELS } from "@/types";
import type { ContactWithAgeRow } from "@/lib/supabase/types";

type ContactDrawerProps = {
  contact: ContactWithAgeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CHANNEL_OPTIONS = [
  "LinkedIn",
  "Telegram",
  "Teams",
  "Skype",
  "Email",
  "Unknown",
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </div>
      {children}
    </section>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-start gap-3">
      <div className="pt-2.5 text-xs font-medium text-slate-500">{label}</div>
      <div>{children}</div>
    </div>
  );
}

export function ContactDrawer({
  contact,
  open,
  onOpenChange,
}: ContactDrawerProps) {
  const { brand } = useBrand();
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (!open || !contact) return;
    let cancelled = false;
    setActivityLoading(true);
    getContactActivity(contact.id, 20).then((rows) => {
      if (cancelled) return;
      setActivity(rows as ActivityRow[]);
      setActivityLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, contact]);

  if (!contact) return null;

  const save =
    (field: Parameters<typeof updateContactField>[1]) =>
    async (value: string | null) => {
      const r = await updateContactField(contact.id, field, value, brand);
      // refresh activity after status/note/date changes
      if (
        r.ok &&
        ["status_nomi", "status_startech", "status_luminarix", "notes", "next_action_at", "last_touch_at"].includes(
          field,
        )
      ) {
        const fresh = await getContactActivity(contact.id, 20);
        setActivity(fresh as ActivityRow[]);
      }
      return r;
    };

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-2xl"
      >
        {/* Header */}
        <SheetHeader className="space-y-3 border-b border-slate-200 bg-gradient-to-br from-white to-slate-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-xl font-semibold leading-tight text-slate-900">
                {contact.name}
              </SheetTitle>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                {contact.role && <span>{contact.role}</span>}
                {contact.role && contact.company && <span>·</span>}
                {contact.company && <span>{contact.company}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ChannelIcon channel={contact.channel} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge value={contact.status_nomi} />
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              Nomi
            </span>
            <span className="text-slate-300">·</span>
            <StatusBadge value={contact.status_startech} />
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              StarTech
            </span>
            <span className="text-slate-300">·</span>
            <StatusBadge value={contact.status_luminarix} />
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              Luminarix
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-7 p-6">
          {/* Quick actions */}
          <Section title="Quick Actions">
            <div className="flex flex-wrap gap-2">
              {contact.linkedin_url && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    LinkedIn
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                </Button>
              )}
              {contact.telegram && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => copyToClipboard(contact.telegram!, "Telegram")}
                >
                  <Send className="h-4 w-4 text-cyan-600" />
                  {contact.telegram}
                  <Copy className="h-3 w-3 text-slate-400" />
                </Button>
              )}
              {contact.email && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <a href={`mailto:${contact.email}`}>
                    <Mail className="h-4 w-4 text-slate-600" />
                    Compose Email
                  </a>
                </Button>
              )}
            </div>
          </Section>

          <Separator />

          <Section title="Contact Info">
            <FieldRow label="Name">
              <EditableText value={contact.name} onSave={save("name")} />
            </FieldRow>
            <FieldRow label="Role">
              <EditableText value={contact.role} onSave={save("role")} placeholder="e.g. Affiliate Manager" />
            </FieldRow>
            <FieldRow label="Company">
              <EditableText
                value={contact.company}
                onSave={save("company")}
                placeholder={contact.network_name_lookup ?? "Company"}
              />
            </FieldRow>
            <FieldRow label="Channel">
              <EditableText
                value={contact.channel}
                onSave={save("channel")}
                suggestions={CHANNEL_OPTIONS}
                placeholder="Unknown"
              />
            </FieldRow>
            <FieldRow label="Email">
              <EditableText
                value={contact.email}
                onSave={save("email")}
                type="email"
                placeholder="name@company.com"
              />
            </FieldRow>
            <FieldRow label="LinkedIn">
              <EditableText
                value={contact.linkedin_url}
                onSave={save("linkedin_url")}
                type="url"
                placeholder="https://linkedin.com/in/…"
              />
            </FieldRow>
            <FieldRow label="Telegram">
              <EditableText
                value={contact.telegram}
                onSave={save("telegram")}
                placeholder="@handle"
              />
            </FieldRow>
            <FieldRow label="Other">
              <EditableText
                value={contact.other_contact}
                onSave={save("other_contact")}
                placeholder="Skype / Teams / Phone"
              />
            </FieldRow>
          </Section>

          <Separator />

          <Section title="Brand Statuses">
            <FieldRow label="Nomi">
              <EditableText
                value={contact.status_nomi}
                onSave={save("status_nomi")}
                suggestions={COMMON_CONTACT_STATUSES}
                placeholder="Pending, Sent, LD…"
              />
            </FieldRow>
            <FieldRow label="StarTech">
              <EditableText
                value={contact.status_startech}
                onSave={save("status_startech")}
                suggestions={COMMON_CONTACT_STATUSES}
                placeholder="Pending, Sent, LD…"
              />
            </FieldRow>
            <FieldRow label="Luminarix">
              <EditableText
                value={contact.status_luminarix}
                onSave={save("status_luminarix")}
                suggestions={COMMON_CONTACT_STATUSES}
                placeholder="Pending, Sent, LD…"
              />
            </FieldRow>
          </Section>

          <Separator />

          <Section title="Cadence">
            <FieldRow label="Last Touch">
              <DateQuickPick
                value={contact.last_touch_at}
                onSave={save("last_touch_at")}
              />
            </FieldRow>
            <FieldRow label="Next Action">
              <DateQuickPick
                value={contact.next_action_at}
                onSave={save("next_action_at")}
              />
            </FieldRow>
          </Section>

          <Separator />

          <Section title="Notes">
            <EditableText
              value={contact.notes}
              onSave={save("notes")}
              multiline
              placeholder="Add notes about this contact, conversations, preferences…"
            />
          </Section>

          <Separator />

          <Section title="Activity">
            {activityLoading ? (
              <div className="text-xs text-slate-400">Loading…</div>
            ) : (
              <ActivityTimeline
                rows={activity}
                emptyHint={`No activity yet for ${contact.name}. Editing fields will create an audit trail you can scan later (active brand: ${BRAND_LABELS[brand]}).`}
              />
            )}
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
