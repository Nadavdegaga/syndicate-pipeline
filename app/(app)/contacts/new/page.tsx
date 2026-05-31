import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddContactForm } from "@/components/contacts/AddContactForm";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  const supabase = createClient();
  const { data: networks } = await supabase
    .from("networks")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Contact"
        icon={UserPlus}
        description="Capture a new affiliate manager, publisher, or network rep. Tour fires the first time you land here."
      />
      <AddContactForm networks={networks ?? []} />
    </div>
  );
}
