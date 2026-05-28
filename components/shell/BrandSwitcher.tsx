"use client";

import { cn } from "@/lib/utils";
import { useBrand } from "@/hooks/useBrand";
import { BRANDS, BRAND_LABELS } from "@/types";

export function BrandSwitcher() {
  const { brand, setBrand } = useBrand();

  return (
    <div
      role="radiogroup"
      aria-label="Active brand"
      data-tour="brand-switcher"
      className="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-xs shadow-sm"
    >
      {BRANDS.map((b) => {
        const active = brand === b;
        return (
          <button
            key={b}
            role="radio"
            aria-checked={active}
            onClick={() => setBrand(b)}
            className={cn(
              "rounded-full px-3 py-1.5 font-medium transition-all",
              active
                ? "bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-md ring-1 ring-slate-900/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {BRAND_LABELS[b]}
          </button>
        );
      })}
    </div>
  );
}
