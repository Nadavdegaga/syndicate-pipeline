import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/shared/PageHeader";
import { FeedbackInbox } from "@/components/feedback/FeedbackInbox";
import { listFeedback } from "@/lib/actions/feedback";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function FeedbackInboxPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    redirect("/settings");
  }

  const service = createServiceClient();
  const [rows, { data: usersData }] = await Promise.all([
    listFeedback(),
    service.auth.admin.listUsers(),
  ]);
  const users = (usersData?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "(no email)",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback Inbox"
        icon={MessageSquare}
        description="Bugs, confusions, suggestions, and missing-feature requests from partners."
        meta={`${rows.filter((r) => r.status === "open").length} open · ${rows.length} total`}
      />
      <FeedbackInbox initialRows={rows} users={users} />
    </div>
  );
}
