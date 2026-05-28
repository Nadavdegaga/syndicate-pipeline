import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/supabase/types";

const TIER_STYLES: Record<NonNullable<Tier>, string> = {
  A: "bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 text-amber-950 ring-amber-500/40 shadow-sm shadow-amber-500/20",
  B: "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-800 ring-slate-400/40 shadow-sm shadow-slate-400/20",
  C: "bg-gradient-to-br from-orange-300 via-amber-600 to-orange-700 text-amber-50 ring-orange-600/40 shadow-sm shadow-orange-600/30",
};

export function TierBadge({
  tier,
  size = "sm",
}: {
  tier: Tier;
  size?: "sm" | "md";
}) {
  if (!tier) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-inset ring-slate-200">
        Untiered
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold ring-1 ring-inset tracking-tight",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        TIER_STYLES[tier],
      )}
    >
      Tier {tier}
    </span>
  );
}
