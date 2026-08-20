"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatFcfa } from "@/lib/format";

const SLOT_COLORS = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)",
  "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)",
];

export function HorizontalBarChart({
  rows,
  categorical = false,
  emptyLabel = "Aucune donnee sur la periode.",
}: {
  rows: { label: string; value: number }[];
  categorical?: boolean;
  emptyLabel?: string;
}) {
  const nonZero = rows.filter((r) => r.value > 0);

  if (nonZero.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const data = nonZero.map((r, i) => ({
    ...r,
    fill: categorical ? SLOT_COLORS[i % SLOT_COLORS.length] : "var(--chart-1)",
  }));
  const config = { value: { label: "Montant" } } satisfies ChartConfig;
  const height = Math.max(120, data.length * 36);

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
        {/* +20% de marge sur le domaine : sans ca, la barre de plus grande
            valeur occupe 100% de la largeur du graphique et son label
            ("11 700 FCFA") n'a plus de place a droite — Recharts le
            retourne alors a la ligne (repli automatique du <Text/>). */}
        <XAxis type="number" hide domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]} />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fill: "var(--muted-foreground)" }}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value) => formatFcfa(Number(value))} hideLabel />}
        />
        <Bar dataKey="value" radius={4} barSize={20}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.fill} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground font-figures text-xs"
            formatter={(value) => (typeof value === "number" ? formatFcfa(value) : "")}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
