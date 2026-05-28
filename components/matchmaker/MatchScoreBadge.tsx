import { scoreTier } from "@/lib/utils/fuzzy";
import { cn } from "@/lib/utils";

const STYLES = {
  strong: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  good: "bg-sky-100 text-sky-700 ring-sky-200",
  weak: "bg-amber-100 text-amber-800 ring-amber-200",
  none: "bg-slate-100 text-slate-500 ring-slate-200",
};

export function MatchScoreBadge({ score }: { score: number }) {
  const tier = scoreTier(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset tabular-nums",
        STYLES[tier],
      )}
      title={`Score ${score}`}
    >
      {tier === "strong" ? "★" : tier === "good" ? "✓" : tier === "weak" ? "·" : ""}
      {score}
    </span>
  );
}
