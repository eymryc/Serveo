"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatFcfa } from "@/lib/format";

// Ordre fixe de la palette categorielle validee (dataviz skill) — jamais
// cyclee/reassignee au hasard, chaque slot garde sa couleur.
const SLOT_COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)",
  "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)",
];

export function PieBreakdownChart({
  rows,
}: {
  rows: { category: string; amount: number; percentage: number }[];
}) {
  const nonZero = rows.filter((r) => r.amount > 0);

  if (nonZero.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Aucune donnee sur la periode.
      </div>
    );
  }

  const data = nonZero.map((r, i) => ({ ...r, fill: SLOT_COLORS[i % SLOT_COLORS.length] }));
  const config = Object.fromEntries(
    data.map((r) => [r.category, { label: r.category, color: r.fill }])
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-[220px]">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="category"
              formatter={(value) => formatFcfa(Number(value))}
              hideLabel
            />
          }
        />
        <Pie data={data} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={80} strokeWidth={2}>
          {data.map((entry) => (
            <Cell key={entry.category} fill={entry.fill} stroke="var(--card)" />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
