"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatFcfa } from "@/lib/format";
import type { FullDashboardData } from "@/lib/types";

const chartConfig = {
  net: { label: "CA Net", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatBucketLabel(iso: string, granularity: "hour" | "day" | "month") {
  const d = new Date(iso);
  if (granularity === "hour") return `${d.getHours()}h`;
  if (granularity === "month") return d.toLocaleDateString("fr-FR", { month: "short" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function RevenueTrendChart({
  data,
  granularity,
}: {
  data: FullDashboardData["timeSeries"];
  granularity: "hour" | "day" | "month";
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Aucune vente sur la periode.
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, label: formatBucketLabel(d.bucket, granularity) }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
      <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="0" className="stroke-border" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis hide domain={[0, (max: number) => max * 1.15]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatFcfa(Number(value))}
              indicator="line"
            />
          }
        />
        <Area
          dataKey="net"
          type="monotone"
          stroke="var(--color-net)"
          strokeWidth={2}
          fill="var(--color-net)"
          fillOpacity={0.1}
        />
      </AreaChart>
    </ChartContainer>
  );
}
