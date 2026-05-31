"use client";

import { useEffect } from "react";
import {
  isTourCompleted,
  startExternalOffersTour,
  startAffiseTour,
  startSmartInsightsTour,
  type TourKey,
} from "@/lib/tour";

type Tour = Extract<TourKey, "externalOffers" | "affise" | "smartInsights">;

const STARTERS: Record<Tour, () => void> = {
  externalOffers: startExternalOffersTour,
  affise: startAffiseTour,
  smartInsights: startSmartInsightsTour,
};

/**
 * Auto-fires a per-page tour on first visit. The Welcome tour at app shell
 * level remains separate (already wired in AppShell). For smartInsights, we
 * additionally require the [data-tour="smart-insights"] anchor to be present
 * — i.e. the user actually has insights to talk about. If the anchor is
 * missing, we silently defer (no point touring an empty section).
 */
export function PageTourLauncher({ tour }: { tour: Tour }) {
  useEffect(() => {
    if (isTourCompleted(tour)) return;
    // Delay so the page DOM has settled (sidebar/chips/etc.)
    const t = setTimeout(() => {
      if (tour === "smartInsights") {
        const anchor = document.querySelector('[data-tour="smart-insights"]');
        if (!anchor) return; // empty state — try again next visit
      }
      STARTERS[tour]();
    }, 600);
    return () => clearTimeout(t);
  }, [tour]);

  return null;
}
