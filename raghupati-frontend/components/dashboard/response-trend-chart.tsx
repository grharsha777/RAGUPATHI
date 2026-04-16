"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const trend = [
  { t: "T-6h", mttr: 42, mttd: 11 },
  { t: "T-5h", mttr: 39, mttd: 10 },
  { t: "T-4h", mttr: 36, mttd: 9 },
  { t: "T-3h", mttr: 33, mttd: 9 },
  { t: "T-2h", mttr: 31, mttd: 8 },
  { t: "T-1h", mttr: 29, mttd: 8 },
];

export function ResponseTrendChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={trend} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="mttr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="mttd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.28} />
            <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="t" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
            fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="mttr" stroke="hsl(var(--chart-1))" fill="url(#mttr)" strokeWidth={2} />
        <Area type="monotone" dataKey="mttd" stroke="hsl(var(--chart-2))" fill="url(#mttd)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
