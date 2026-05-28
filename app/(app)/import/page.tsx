import { Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ImportWizard } from "@/components/import/ImportWizard";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import"
        icon={Upload}
        description="Bulk-load contacts, networks, offers, wishlists, or demand items from CSV or Excel."
        meta="Networks are upserted by name; everything else is plain insert. Use Undo on the result page to roll back."
      />
      <ImportWizard />
    </div>
  );
}
