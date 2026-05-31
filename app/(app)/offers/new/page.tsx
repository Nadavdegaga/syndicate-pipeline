import { Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddOfferForm } from "@/components/offers/AddOfferForm";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  const supabase = createClient();
  const { data: networks } = await supabase
    .from("networks")
    .select("id, name")
    .order("name", { ascending: true });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Offer"
        icon={Briefcase}
        description="Catalog a new campaign across one of your networks."
      />
      <AddOfferForm networks={networks ?? []} />
    </div>
  );
}
