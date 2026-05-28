"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { encodeFilter, decodeFilter } from "@/lib/utils/filter";
import { deleteSavedView } from "@/lib/actions/saved-views";
import type {
  SavedView,
  EntityType,
  DefaultView,
} from "@/lib/saved-views/defaults";

type AnyView = SavedView | DefaultView;

export function SavedViewsBar({
  defaultViews,
  userViews,
}: {
  defaultViews: DefaultView[];
  userViews: SavedView[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentEnc = params.get("f") ?? "";
  const currentSpec = decodeFilter(currentEnc);
  const all: AnyView[] = [...defaultViews, ...userViews];

  function selectView(view: AnyView) {
    const enc = encodeFilter(view.filters);
    const next = new URLSearchParams(params.toString());
    if (enc) next.set("f", enc);
    else next.delete("f");
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function isActive(view: AnyView) {
    const a = JSON.stringify(view.filters);
    const b = JSON.stringify(currentSpec);
    return a === b;
  }

  function remove(v: SavedView) {
    if (!confirm(`Delete view "${v.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteSavedView(v.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("View deleted");
      router.refresh();
    });
  }

  return (
    <div className="-mx-1 flex flex-wrap items-center gap-1.5 overflow-x-auto px-1 pb-1">
      {all.map((v) => {
        const active = isActive(v);
        const isUserOwned = !("is_default" in v && v.is_default === true);
        return (
          <div key={v.id} className="group relative">
            <button
              type="button"
              onClick={() => selectView(v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              {v.name}
            </button>
            {isUserOwned && (
              <button
                type="button"
                onClick={() => remove(v as SavedView)}
                disabled={pending}
                className={cn(
                  "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-0 transition-opacity",
                  "hover:bg-red-50 hover:text-red-600",
                  "group-hover:opacity-100",
                )}
                aria-label={`Delete ${v.name}`}
              >
                {pending ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <X className="h-2.5 w-2.5" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

type EntityHelper = EntityType;
export type { EntityHelper };
