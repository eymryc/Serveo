"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { fillTimeSeries } from "@/lib/dashboard-math";
import { formatFcfa } from "@/lib/format";
import type { FullDashboardData } from "@/lib/types";

const chartConfig = {
  net: { label: "CA Net", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatBucketLabel(iso: string, granularity: "hour" | "day" | "month") {
  const d = new Date(iso);
  if (granularity === "hour") {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (granularity === "month") {
    return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatBucketTooltip(iso: string, granularity: "hour" | "day" | "month") {
  const d = new Date(iso);
  if (granularity === "hour") {
    return d.toLocaleString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (granularity === "month") {
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function formatAxisAmount(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}k`;
  return String(Math.round(value));
}

export function RevenueTrendChart({
  data,
  from,
  to,
  granularity,
}: {
  data: FullDashboardData["timeSeries"];
  from: string;
  to: string;
  granularity: "hour" | "day" | "month";
}) {
  const chartData = useMemo(() => {
    const filled = fillTimeSeries(data, new Date(from), new Date(to), granularity);
    return filled.map((d) => ({
      ...d,
      label: formatBucketLabel(d.bucket, granularity),
      tooltipLabel: formatBucketTooltip(d.bucket, granularity),
    }));
  }, [data, from, to, granularity]);

  const hasRevenue = chartData.some((d) => d.net > 0);

  if (!hasRevenue) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Aucune vente sur la periode.
      </div>
    );
  }

  const tickStep = chartData.length > 14 ? Math.ceil(chartData.length / 7) : 1;

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
      <AreaChart data={chartData} margin={{ left: 4, right: 12, top: 12, bottom: 4 }}>
        <defs>
          <linearGradient id="caFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-net)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-net)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/70" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={20}
          interval={tickStep > 1 ? (index: number) => index % tickStep === 0 : "preserveStartEnd"}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={44}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={formatAxisAmount}
          domain={[0, (max: number) => Math.max(max * 1.15, 1)]}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const row = payload[0].payload as (typeof chartData)[number];
            return (
              <div className="rounded-md border border-border bg-card px-3 py-2 shadow-sm">
                <p className="text-xs text-muted-foreground">{row.tooltipLabel}</p>
                <p className="font-figures mt-0.5 text-sm font-bold tabular-nums">
                  {formatFcfa(Number(row.net))}
                </p>
              </div>
            );
          }}
        />
        <Area
          dataKey="net"
          type="monotone"
          stroke="none"
          fill="url(#caFill)"
          isAnimationActive
        />
        <Line
          dataKey="net"
          type="monotone"
          stroke="var(--color-net)"
          strokeWidth={2.5}
          dot={(props) => {
            const { cx, cy, payload } = props as {
              cx?: number;
              cy?: number;
              payload?: { net: number };
            };
            if (!cx || !cy || !payload || payload.net <= 0) return null;
            return (
              <circle
                cx={cx}
                cy={cy}
                r={4}
                fill="var(--card)"
                stroke="var(--color-net)"
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ r: 5, fill: "var(--color-net)", stroke: "var(--card)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
