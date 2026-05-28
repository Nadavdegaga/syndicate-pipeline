import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { MatchMakerClient } from "@/components/matchmaker/MatchMakerClient";
import { listPublishers } from "@/lib/actions/matchmaker";

export const dynamic = "force-dynamic";

type SearchParams = { offer?: string; wishlist?: string; publisher?: string };

export default async function MatchMakerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  // Hydrate the offer list once on the server (cheap, ~231 rows)
  const { data: offers } = await supabase
    .from("offers")
    .select("id, name, network_name, vertical")
    .in("status", ["active", "needs_traffic", "direct"])
    .order("created_at", { ascending: false })
    .limit(500);

  const publishers = await listPublishers();

  // If wishlist id provided, lookup its publisher_name to preselect.
  let initialPublisher: string | undefined;
  if (searchParams.wishlist) {
    const { data: w } = await supabase
      .from("publisher_wishlists")
      .select("publisher_name")
      .eq("id", searchParams.wishlist)
      .maybeSingle();
    initialPublisher = w?.publisher_name ?? undefined;
  }
  if (searchParams.publisher) initialPublisher = searchParams.publisher;

  return (
    <div className="space-y-6">
      <PageHeader
        title="MatchMaker"
        icon={Search}
        description="Pair publisher wishlists with offers by vertical and name-token overlap. Score ≥ 50 = strong, ≥ 30 = good, ≥ 20 = weak."
        meta="Algorithm: vertical exact match +50 · partial vertical +25 · each shared name token +10"
      />
      <MatchMakerClient
        initialPublishers={publishers}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialOffers={(offers ?? []) as any}
        initialOfferId={searchParams.offer}
        initialPublisher={initialPublisher}
      />
    </div>
  );
}
