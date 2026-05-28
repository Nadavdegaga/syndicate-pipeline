import Link from "next/link";
import { TierBadge } from "@/components/networks/TierBadge";
import { relativeOrDash } from "@/lib/utils/dates";
import type { TopNetworkRow } from "@/lib/actions/insights";
import type { Tier } from "@/lib/supabase/types";

export function TopNetworksTable({ rows }: { rows: TopNetworkRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No networks yet
      </div>
    );
  }
  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <th className="py-2 pr-3 font-semibold">Network</th>
            <th className="py-2 pr-3 font-semibold">Tier</th>
            <th className="py-2 pr-3 text-right font-semibold">Contacts</th>
            <th className="py-2 pr-3 text-right font-semibold">Offers</th>
            <th className="py-2 font-semibold">Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id}
              className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                i % 2 === 1 ? "bg-slate-50/40" : ""
              }`}
            >
              <td className="py-2.5 pr-3">
                <Link
                  href={`/networks/${r.id}`}
                  className="font-medium text-slate-900 group-hover:underline"
                >
                  {r.name}
                </Link>
              </td>
              <td className="py-2.5 pr-3">
                <TierBadge tier={r.tier as Tier} />
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums">
                {r.contact_count.toLocaleString()}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums">
                {r.offer_count.toLocaleString()}
              </td>
              <td className="py-2.5 text-slate-500">
                {relativeOrDash(r.last_contact_touch_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
