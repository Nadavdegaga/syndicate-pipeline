"use client";

import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startWelcomeTour,
  startMatchMakerTour,
  startAddContactTour,
} from "@/lib/tour";

export function HelpButton() {
  const pathname = usePathname();

  function launch() {
    if (pathname.startsWith("/matchmaker")) {
      startMatchMakerTour();
      return;
    }
    if (pathname.startsWith("/contacts/new")) {
      startAddContactTour();
      return;
    }
    startWelcomeTour();
  }

  const label = pathname.startsWith("/matchmaker")
    ? "Replay MatchMaker tour"
    : pathname.startsWith("/contacts/new")
      ? "Replay Add Contact tour"
      : "Replay welcome tour";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-slate-500 hover:text-slate-900"
      aria-label={label}
      title={label}
      onClick={launch}
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );
}
