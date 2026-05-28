"use client";

import { useEffect } from "react";
import { isTourCompleted, startWelcomeTour } from "@/lib/tour";

/**
 * Mounts once on first authenticated load. If the user hasn't completed the
 * welcome tour yet, fire it after a short delay so the shell + sidebar are
 * mounted and data-tour selectors resolve.
 */
export function TourLauncher() {
  useEffect(() => {
    if (isTourCompleted()) return;
    const t = setTimeout(() => {
      startWelcomeTour();
    }, 800);
    return () => clearTimeout(t);
  }, []);
  return null;
}
