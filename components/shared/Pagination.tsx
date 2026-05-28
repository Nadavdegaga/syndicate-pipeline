"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function href(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p === 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const linkClass = (disabled: boolean) =>
    cn(
      "inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600",
      disabled
        ? "pointer-events-none opacity-40"
        : "hover:bg-slate-50 hover:text-slate-900",
    );

  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <div>
        {total === 0 ? "0 results" : `${start}–${end} of ${total.toLocaleString()}`}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">
          Page {page} of {totalPages}
        </span>
        <Link
          href={href(page - 1)}
          aria-label="Previous page"
          className={linkClass(prevDisabled)}
          aria-disabled={prevDisabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={href(page + 1)}
          aria-label="Next page"
          className={linkClass(nextDisabled)}
          aria-disabled={nextDisabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
