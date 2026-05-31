import Link from "next/link";
import {
  Settings as SettingsIcon,
  Users,
  Activity,
  MessageSquare,
  Download,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Separator } from "@/components/ui/separator";
import { ExportAllButton } from "@/components/settings/ExportAllButton";
import { isAdminEmail } from "@/lib/admin";
import { countOpenFeedback } from "@/lib/actions/feedback";

export const dynamic = "force-dynamic";

type LinkCard = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
};

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  const openFeedback = isAdmin ? await countOpenFeedback() : 0;

  const cards: LinkCard[] = [
    {
      href: "/settings/team",
      title: "Team",
      description: "Members with access to this workspace.",
      icon: Users,
    },
    {
      href: "/settings/feedback",
      title: "Feedback Inbox",
      description: "Bugs, confusion, suggestions submitted by partners.",
      icon: MessageSquare,
      badge: openFeedback,
      adminOnly: true,
    },
    {
      href: "/settings/activity",
      title: "Activity History",
      description: "Global timeline of every meaningful change.",
      icon: Activity,
      adminOnly: true,
    },
  ];

  const visible = cards.filter((c) => !c.adminOnly || isAdmin);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        icon={SettingsIcon}
        description="Workspace settings, team, and data tools."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200 group-hover:bg-slate-900 group-hover:ring-slate-900">
                  <Icon className="h-5 w-5 text-slate-600 group-hover:text-white" />
                </div>
                <div className="flex items-center gap-2">
                  {c.badge ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-800">
                      {c.badge} open
                    </span>
                  ) : null}
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-700" />
                </div>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{c.description}</p>
            </Link>
          );
        })}
      </section>

      {isAdmin && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Data export</h3>
          </div>
          <Separator className="my-4" />
          <p className="text-sm text-slate-600">
            Download a ZIP with one CSV per table: networks, contacts, offers,
            wishlists, demand, and the activity log. Includes a{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">manifest.json</code>{" "}
            with row counts and the export timestamp.
          </p>
          <div className="mt-4">
            <ExportAllButton />
          </div>
        </section>
      )}
    </div>
  );
}
