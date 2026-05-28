import { Target } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { HotFollowupsCard } from "@/components/actions/HotFollowupsCard";
import { ColdLeadsCard } from "@/components/actions/ColdLeadsCard";
import { UntouchedATierCard } from "@/components/actions/UntouchedATierCard";
import { NewOffersCard } from "@/components/actions/NewOffersCard";
import { PublisherAsksCard } from "@/components/actions/PublisherAsksCard";
import { getTodayData } from "@/lib/actions/today";
import { getServerBrand } from "@/lib/utils/server-brand";
import { BRAND_LABELS } from "@/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const brand = getServerBrand();
  const data = await getTodayData(brand);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's Actions"
        icon={Target}
        description={`What to do right now in ${BRAND_LABELS[brand]}. Five focused buckets — work through them top to bottom.`}
        meta="Each card surfaces top 5; the count shows how many qualify in total."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <HotFollowupsCard rows={data.hotFollowups.rows} total={data.hotFollowups.total} />
        <ColdLeadsCard rows={data.coldLeads.rows} total={data.coldLeads.total} />
        <UntouchedATierCard rows={data.untouchedATier.rows} total={data.untouchedATier.total} />
        <NewOffersCard rows={data.newOffers.rows} total={data.newOffers.total} />
        <PublisherAsksCard rows={data.publisherAsks.rows} total={data.publisherAsks.total} />
      </div>
    </div>
  );
}
