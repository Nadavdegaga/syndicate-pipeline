import { Radio } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddNetworkForm } from "@/components/networks/AddNetworkForm";

export default function NewNetworkPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Network"
        icon={Radio}
        description="Capture a new affiliate or ad network. The name must be unique."
      />
      <AddNetworkForm />
    </div>
  );
}
