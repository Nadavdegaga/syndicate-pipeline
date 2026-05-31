import { redirect } from "next/navigation";
import { Activity as ActivityIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  ActivityHistory,
  type ActivityEntry,
} from "@/components/activity/ActivityHistory";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function ActivityHistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    redirect("/settings");
  }

  const service = createServiceClient();
  const [{ data: rows }, { data: usersData }] = await Promise.all([
    supabase
      .from("activity_log")
      .select("id, entity_type, entity_id, action, from_value, to_value, actor_id, brand_context, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    service.auth.admin.listUsers(),
  ]);

  const users = (usersData?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "(no email)",
  }));
  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  const entries: ActivityEntry[] = (rows ?? []).map((r) => ({
    ...r,
    actor_email: r.actor_id ? emailMap.get(r.actor_id) ?? null : null,
  })) as ActivityEntry[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity History"
        icon={ActivityIcon}
        description="Every meaningful change across the workspace. Filter by user, entity, brand, action, and date range."
        meta={`Showing the last ${entries.length} entries`}
      />
      <ActivityHistory initialRows={entries} users={users} />
    </div>
  );
}
