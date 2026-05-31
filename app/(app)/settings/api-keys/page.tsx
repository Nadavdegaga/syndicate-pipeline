import { redirect } from "next/navigation";
import { Key } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  IngestKeysManager,
  type IngestKeyRow,
} from "@/components/settings/IngestKeysManager";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    redirect("/settings");
  }

  const { data: keys } = await supabase
    .from("api_ingest_keys")
    .select("id, label, scopes, created_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="API ingest keys"
        icon={Key}
        description="Keys for server-to-server data ingest (Affise stats and future integrations). Plaintext is shown once on generate; we only store SHA-256 hashes."
      />
      <IngestKeysManager initialKeys={(keys ?? []) as IngestKeyRow[]} />
    </div>
  );
}
