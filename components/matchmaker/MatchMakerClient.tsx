"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  Briefcase,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  listPublishers,
  getMatchesForPublisher,
  getMatchesForOffer,
  markWishlistMatched,
} from "@/lib/actions/matchmaker";
import { useDebounce } from "@/hooks/useDebounce";
import { shortDateOrDash } from "@/lib/utils/dates";
import type { OfferRow } from "@/lib/supabase/types";

type Publisher = { contact_id: string | null; name: string; channel: string | null };

export function MatchMakerClient({
  initialPublishers,
  initialOffers,
  initialOfferId,
  initialPublisher,
}: {
  initialPublishers: Publisher[];
  initialOffers: { id: string; name: string; network_name: string | null; vertical: string | null }[];
  initialOfferId?: string;
  initialPublisher?: string;
}) {
  return (
    <Tabs defaultValue={initialOfferId ? "offer" : "publisher"}>
      <TabsList className="bg-white">
        <TabsTrigger value="publisher" className="gap-2">
          <Users className="h-4 w-4" /> By publisher
        </TabsTrigger>
        <TabsTrigger value="offer" className="gap-2">
          <Briefcase className="h-4 w-4" /> By offer
        </TabsTrigger>
      </TabsList>
      <TabsContent value="publisher" className="space-y-4">
        <ByPublisher initialPublishers={initialPublishers} initialPublisher={initialPublisher} />
      </TabsContent>
      <TabsContent value="offer" className="space-y-4">
        <ByOffer initialOffers={initialOffers} initialOfferId={initialOfferId} />
      </TabsContent>
    </Tabs>
  );
}

// ===== By Publisher =====
function ByPublisher({
  initialPublishers,
  initialPublisher,
}: {
  initialPublishers: Publisher[];
  initialPublisher?: string;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 250);
  const [publishers, setPublishers] = useState<Publisher[]>(initialPublishers);
  const [selected, setSelected] = useState<string | null>(initialPublisher ?? null);
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof getMatchesForPublisher>>>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [pendingMatch, startPendingMatch] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listPublishers(debounced);
      if (!cancelled) setPublishers(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoadingMatches(true);
    getMatchesForPublisher(selected).then((res) => {
      if (cancelled) return;
      setMatches(res);
      setLoadingMatches(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function confirmMatch(wishlistId: string, offerId: string) {
    startPendingMatch(async () => {
      const r = await markWishlistMatched(wishlistId, offerId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Marked as matched");
      // Refresh
      if (selected) {
        const fresh = await getMatchesForPublisher(selected);
        setMatches(fresh);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search publishers…"
            className="pl-8"
          />
        </div>
        <div className="max-h-[480px] overflow-y-auto">
          {publishers.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              No publishers match
            </div>
          ) : (
            publishers.map((p) => (
              <button
                key={p.name}
                onClick={() => setSelected(p.name)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selected === p.name
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{p.name}</span>
                {p.channel && (
                  <span
                    className={`text-[10px] uppercase tracking-wider ${
                      selected === p.name ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {p.channel}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        {!selected ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <EmptyState
              icon={Sparkles}
              title="Pick a publisher to see matches"
              description="The left panel lists publishers we've seen in wishlists or Telegram/Skype contacts. Pick one to surface their open requests and ranked offer matches."
            />
          </div>
        ) : loadingMatches ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Scoring matches…
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <EmptyState
              icon={Users}
              title="No open wishlists for this publisher"
              description="They have no open requests right now. Try another publisher, or add a wishlist on the wishlists page."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wider text-slate-400">
              {selected} · {matches.length} request{matches.length === 1 ? "" : "s"}
            </div>
            {matches.map(({ wishlist, matches: offerMatches }) => (
              <div
                key={wishlist.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {wishlist.requested_offer}
                    </div>
                    <div className="text-xs text-slate-500">
                      {wishlist.vertical ?? "—"} · requested{" "}
                      {shortDateOrDash(wishlist.requested_at)} ·{" "}
                      <span
                        className={
                          wishlist.status === "open"
                            ? "text-amber-700"
                            : wishlist.status === "matched"
                              ? "text-blue-700"
                              : wishlist.status === "delivered"
                                ? "text-emerald-700"
                                : "text-slate-500"
                        }
                      >
                        {wishlist.status}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />

                {offerMatches.length === 0 ? (
                  <div className="px-1 py-2 text-xs text-slate-400">
                    No offers cross the match threshold yet.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {offerMatches.map((m) => (
                      <li
                        key={m.offer_id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/offers/${m.offer_id}`}
                            className="block truncate text-sm font-medium text-slate-900 hover:underline"
                          >
                            {m.name}
                          </Link>
                          <div className="truncate text-xs text-slate-500">
                            {m.network_name ?? "—"}
                            {m.vertical && ` · ${m.vertical}`}
                            {m.payout && ` · ${m.payout}`}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <MatchScoreBadge score={m.score} />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmMatch(wishlist.id, m.offer_id)}
                            disabled={pendingMatch || wishlist.status === "matched"}
                          >
                            {pendingMatch ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            <span className="ml-1 text-xs">Mark matched</span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== By Offer =====
function ByOffer({
  initialOffers,
  initialOfferId,
}: {
  initialOffers: { id: string; name: string; network_name: string | null; vertical: string | null }[];
  initialOfferId?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(initialOfferId ?? null);
  const [offerInfo, setOfferInfo] = useState<OfferRow | null>(null);
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof getMatchesForOffer>>["matches"]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingMatch, startPendingMatch] = useTransition();

  const filtered = query
    ? initialOffers.filter((o) =>
        (o.name + " " + (o.network_name ?? "") + " " + (o.vertical ?? ""))
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : initialOffers;

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    getMatchesForOffer(selected).then((r) => {
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOfferInfo(r.offer as any);
      setMatches(r.matches);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function confirmMatch(wishlistId: string) {
    if (!selected) return;
    startPendingMatch(async () => {
      const r = await markWishlistMatched(wishlistId, selected);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Marked as matched");
      const fresh = await getMatchesForOffer(selected);
      setMatches(fresh.matches);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search offers…"
            className="pl-8"
          />
        </div>
        <div className="max-h-[480px] overflow-y-auto">
          {filtered.slice(0, 200).map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selected === o.id ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="truncate font-medium">{o.name}</span>
              <span className={`truncate text-[11px] ${selected === o.id ? "text-slate-300" : "text-slate-500"}`}>
                {o.network_name ?? "—"}
                {o.vertical && ` · ${o.vertical}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        {!selected ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <EmptyState
              icon={Sparkles}
              title="Pick an offer to find publishers"
              description="The left panel lists active/needs-traffic/direct offers. Pick one to see open publisher wishlists that match by vertical or offer-name tokens."
            />
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Scoring matches…
          </div>
        ) : (
          <div className="space-y-4">
            {offerInfo && (
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wider text-slate-400">
                  Matching for
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {offerInfo.name}
                </div>
                <div className="text-xs text-slate-500">
                  {offerInfo.network_name ?? "—"}
                  {offerInfo.vertical && ` · ${offerInfo.vertical}`}
                  {offerInfo.payout && ` · ${offerInfo.payout}`}
                </div>
              </div>
            )}

            {matches.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <EmptyState
                  icon={Users}
                  title="No publishers above the match threshold"
                  description="No open wishlists share enough vertical/name overlap with this offer."
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                  {matches.map((m) => (
                    <li
                      key={m.wishlist_id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {m.publisher_name ?? "(unknown)"}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          wants <span className="text-slate-700">{m.requested_offer}</span>
                          {m.vertical && ` · ${m.vertical}`}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <MatchScoreBadge score={m.score} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmMatch(m.wishlist_id)}
                          disabled={pendingMatch}
                        >
                          {pendingMatch ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span className="ml-1 text-xs">Mark matched</span>
                        </Button>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
