import Link from "next/link";
import { Users, Table } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { KanbanBoard } from "@/components/contacts/KanbanBoard";
import type { ContactWithAgeRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 500;

export default async function ContactsKanbanPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("v_contacts_with_age")
    .select("*")
    .order("last_touch_at", { ascending: false, nullsFirst: false })
    .limit(PAGE_LIMIT);

  const rows = (data ?? []) as ContactWithAgeRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts · Kanban"
        icon={Users}
        description={`Top ${PAGE_LIMIT} contacts grouped by status category. Drag a card to a new column to update the status.`}
        meta="Brand-aware: column grouping follows the active brand's status field."
        actions={
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/contacts">
              <Table className="h-4 w-4" /> Table view
            </Link>
          </Button>
        }
      />
      <KanbanBoard rows={rows} />
    </div>
  );
}
