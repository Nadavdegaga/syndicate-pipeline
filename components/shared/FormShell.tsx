"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FormShell({
  title,
  subtitle,
  backHref,
  backLabel,
  pending,
  onSubmit,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={onSubmit}>
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          <div className="space-y-6 p-6">{children}</div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Button asChild type="button" variant="ghost" disabled={pending}>
              <Link href={backHref}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
