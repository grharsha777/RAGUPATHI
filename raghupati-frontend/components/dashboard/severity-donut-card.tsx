"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIncidentsQuery } from "@/lib/hooks/use-incidents";
import type { Severity } from "@/lib/types/domain";

const COLORS: Record<Severity, string> = {
  LOW: "hsl(var(--severity-low))",
  MEDIUM: "hsl(var(--severity-medium))",
  HIGH: "hsl(var(--severity-high))",
  CRITICAL: "hsl(var(--severity-critical))",
};

export function SeverityDonutCard() {
  const incidents = useIncidentsQuery();

  const data = useMemo(() => {
    const counts: Record<Severity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const incident of incidents.data ?? []) {
      counts[incident.severity] += 1;
    }
    return (Object.keys(counts) as Severity[]).map((severity) => ({
      name: severity,
      value: counts[severity],
      fill: COLORS[severity],
    }));
  }, [incidents.data]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Severity distribution</CardTitle>
        <CardDescription className="text-xs">Weighted by open incident backlog.</CardDescription>
      </CardHeader>
      <CardContent className="h-[220px] pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} stroke="hsl(var(--card))" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value}`, name]}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
