"use client";

import { useBrand } from "@/hooks/useBrand";
import { BRAND_COLORS } from "@/lib/utils/brand";
import { BRANDS, BRAND_LABELS } from "@/types";
import { cn } from "@/lib/utils";

export function BrandSwitcher() {
  const { brand, setBrand } = useBrand();
  const colors = BRAND_COLORS[brand];

  return (
    <div
      role="radiogroup"
      aria-label="Active brand"
      data-tour="brand-switcher"
      className={cn(
        "mx-3 rounded-xl border bg-white shadow-sm transition-colors duration-200",
        colors.border,
      )}
    >
      {/* Active brand display */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-t-xl border-b px-3 py-2.5 transition-colors duration-200",
          colors.bg,
          colors.border,
        )}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full transition-colors duration-200", colors.dot)} />
        <span className={cn("text-sm font-semibold transition-colors duration-200", colors.accent)}>
          {BRAND_LABELS[brand]}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400">
          Active Mode
        </span>
      </div>

      {/* Brand selector grid */}
      <div className="grid grid-cols-2 gap-1 p-1.5">
        {BRANDS.map((b) => {
          const active = brand === b;
          const c = BRAND_COLORS[b];
          return (
            <button
              key={b}
              role="radio"
              aria-checked={active}
              onClick={() => setBrand(b)}
              className={cn(
                "w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-all",
                active ? c.buttonActive : cn("text-slate-500", c.buttonHover),
              )}
            >
              {BRAND_LABELS[b]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
