import { Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  ConnectionsManager,
  type ConnectionFull,
} from "@/components/external-offers/ConnectionsManager";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("platform_connections")
    .select(
      "id, platform, display_name, base_url, sync_frequency_hours, last_sync_at, last_sync_status, last_sync_error, active, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Connections"
        icon={Globe}
        description="Manage which platforms we pull offers from. API keys are stored encrypted at rest."
        meta="Vercel Cron runs every 6 hours and triggers sync for connections that are due."
      />

      <ConnectionsManager
        initialConnections={(data ?? []) as ConnectionFull[]}
      />
    </div>
  );
}
