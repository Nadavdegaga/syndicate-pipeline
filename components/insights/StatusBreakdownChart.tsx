"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { StatusBreakdownPoint } from "@/lib/actions/insights";

export function StatusBreakdownChart({
  data,
}: {
  data: StatusBreakdownPoint[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">
        No status data yet
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category"
            cx="40%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.category} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const n = Number(value);
              return [
                `${n.toLocaleString()} (${Math.round((n / total) * 100)}%)`,
                String(name),
              ];
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
