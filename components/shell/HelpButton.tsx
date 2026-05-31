"use client";

import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startWelcomeTour,
  startMatchMakerTour,
  startAddContactTour,
  startExternalOffersTour,
  startAffiseTour,
  startSmartInsightsTour,
} from "@/lib/tour";

type RouteTour = { match: (p: string) => boolean; label: string; start: () => void };

const ROUTE_TOURS: RouteTour[] = [
  {
    match: (p) => p.startsWith("/matchmaker"),
    label: "Replay MatchMaker tour",
    start: startMatchMakerTour,
  },
  {
    match: (p) => p.startsWith("/contacts/new"),
    label: "Replay Add Contact tour",
    start: startAddContactTour,
  },
  {
    match: (p) => p.startsWith("/external-offers"),
    label: "Replay External Offers tour",
    start: startExternalOffersTour,
  },
  {
    match: (p) => p.startsWith("/reporting/affise"),
    label: "Replay Affise Reporting tour",
    start: startAffiseTour,
  },
  {
    match: (p) => p.startsWith("/insights"),
    label: "Replay Smart Insights tour",
    start: startSmartInsightsTour,
  },
];

export function HelpButton() {
  const pathname = usePathname();
  const match = ROUTE_TOURS.find((t) => t.match(pathname));
  const label = match?.label ?? "Replay welcome tour";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-slate-500 hover:text-slate-900"
      aria-label={label}
      title={label}
      onClick={() => (match ? match.start() : startWelcomeTour())}
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );
}
