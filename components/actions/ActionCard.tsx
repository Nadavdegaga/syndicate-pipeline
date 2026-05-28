import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

type ActionCardProps = {
  title: string;
  emoji: string;
  count: number;
  description: string;
  viewAllHref?: string;
  emptyMessage?: string;
  emptyEmoji?: string;
  children?: React.ReactNode;
};

export function ActionCard({
  title,
  emoji,
  count,
  description,
  viewAllHref,
  emptyMessage = "All caught up!",
  emptyEmoji = "🎉",
  children,
}: ActionCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              {emoji}
            </span>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-700">
              {count}
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      <div className="flex-1 px-2">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">{emptyMessage}</p>
            <p className="text-xs text-slate-500">
              {emptyEmoji} Nothing in this bucket right now.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">{children}</div>
        )}
      </div>

      {count > 5 && viewAllHref && (
        <div className="border-t border-slate-100 px-5 py-3 text-right">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            View all {count.toLocaleString()}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
