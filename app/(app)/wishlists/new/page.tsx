import { Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddWishlistForm } from "@/components/wishlists/AddWishlistForm";

export const dynamic = "force-dynamic";

export default async function NewWishlistPage() {
  const supabase = createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name")
    .in("channel", ["Telegram", "Skype"])
    .order("name", { ascending: true })
    .limit(500);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Wishlist"
        icon={Handshake}
        description="Record a publisher's ask. We'll match it to active offers in MatchMaker."
      />
      <AddWishlistForm contacts={contacts ?? []} />
    </div>
  );
}
