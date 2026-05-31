import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddDemandForm } from "@/components/demand/AddDemandForm";

export const dynamic = "force-dynamic";

export default async function NewDemandPage() {
  const supabase = createClient();
  const { data: networks } = await supabase
    .from("networks")
    .select("id, name")
    .order("name", { ascending: true });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Demand Item"
        icon={TrendingUp}
        description="Log an offer a network needs traffic for."
      />
      <AddDemandForm networks={networks ?? []} />
    </div>
  );
}
