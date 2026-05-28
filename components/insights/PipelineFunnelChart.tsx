"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { FunnelPoint } from "@/lib/actions/insights";

const STAGE_COLOR: Record<string, string> = {
  Cold: "#D9D9D9",
  Pending: "#FFE699",
  Sent: "#9DC3E6",
  "In Conversation": "#A9D08E",
  Approved: "#70AD47",
  Working: "#5B8C3C",
};

export function PipelineFunnelChart({ data }: { data: FunnelPoint[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">
        No pipeline data yet
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 24, left: 24, bottom: 10 }}
        >
          <XAxis
            dataKey="stage"
            stroke="#475569"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            cursor={{ fill: "#f1f5f9" }}
            formatter={(value) => [`${Number(value)} contacts`, "Count"]}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.stage} fill={STAGE_COLOR[d.stage] ?? "#94a3b8"} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{ fontSize: 11, fill: "#64748b" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
