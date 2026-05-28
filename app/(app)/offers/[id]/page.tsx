import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OfferDetailClient } from "@/components/offers/OfferDetailClient";
import type { OfferRow } from "@/lib/supabase/types";

export default async function OfferDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("offers")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();
  return <OfferDetailClient offer={data as OfferRow} />;
}
