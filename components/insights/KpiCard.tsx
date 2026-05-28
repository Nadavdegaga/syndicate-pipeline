import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  accent?: "default" | "amber" | "green" | "blue" | "purple";
  href?: string;
};

const ACCENTS = {
  default: "from-slate-50 to-white",
  amber: "from-amber-50 to-white",
  green: "from-emerald-50 to-white",
  blue: "from-sky-50 to-white",
  purple: "from-violet-50 to-white",
};

const ACCENT_ICON_BG = {
  default: "bg-slate-100 text-slate-500",
  amber: "bg-amber-100 text-amber-600",
  green: "bg-emerald-100 text-emerald-600",
  blue: "bg-sky-100 text-sky-600",
  purple: "bg-violet-100 text-violet-600",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "default",
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-gradient-to-br p-5 shadow-sm transition-shadow hover:shadow-md",
        ACCENTS[accent],
      )}
    >
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              ACCENT_ICON_BG[accent],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-slate-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
