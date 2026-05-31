import { Users as UsersIcon, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { relativeOrDash } from "@/lib/utils/dates";
import { BRAND_LABELS } from "@/types";
import type { Brand } from "@/types";

export const dynamic = "force-dynamic";

function initialsFromEmail(email: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function displayNameFromEmail(email: string | null): string {
  if (!email) return "—";
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export default async function TeamPage() {
  const supabase = createClient();
  const service = createServiceClient();
  const { data: usersData } = await service.auth.admin.listUsers();
  const users = usersData?.users ?? [];

  // Activity counts in last 30 days, per user
  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 30);
  const { data: recent } = await supabase
    .from("activity_log")
    .select("actor_id")
    .gte("created_at", thirty.toISOString())
    .not("actor_id", "is", null)
    .limit(20000);
  const counts = new Map<string, number>();
  for (const r of recent ?? []) {
    if (r.actor_id) counts.set(r.actor_id, (counts.get(r.actor_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        icon={UsersIcon}
        description="Members with access to this workspace. Read-only — admin manages users in the Supabase dashboard."
        meta={`${users.length} user${users.length === 1 ? "" : "s"}`}
      />

      {users.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={UsersIcon}
            title="No users yet"
            description="Add users in Supabase → Authentication → Users."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => {
            const email = u.email ?? null;
            const initials = initialsFromEmail(email);
            const defaultBrand =
              (u.user_metadata?.default_brand as Brand | undefined) ?? "all";
            const lastSignIn = u.last_sign_in_at ?? null;
            const created = u.created_at;
            const activityCount = counts.get(u.id) ?? 0;
            return (
              <div
                key={u.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-medium text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-slate-900">
                      {displayNameFromEmail(email)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate" title={email ?? ""}>
                        {email ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <dt className="text-slate-500">Default brand</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {BRAND_LABELS[defaultBrand]}
                  </dd>
                  <dt className="text-slate-500">Last login</dt>
                  <dd className="text-right text-slate-700">
                    {relativeOrDash(lastSignIn)}
                  </dd>
                  <dt className="text-slate-500">Joined</dt>
                  <dd className="text-right text-slate-700">
                    {relativeOrDash(created)}
                  </dd>
                  <dt className="text-slate-500">Activities (30d)</dt>
                  <dd className="text-right font-medium tabular-nums text-slate-900">
                    {activityCount}
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
