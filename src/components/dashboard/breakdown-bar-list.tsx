"use client";

import { formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";

const SLOT_COLORS = [
  "bg-[var(--chart-1)]",
  "bg-[var(--chart-2)]",
  "bg-[var(--chart-3)]",
  "bg-[var(--chart-4)]",
  "bg-[var(--chart-5)]",
  "bg-[var(--chart-6)]",
  "bg-[var(--chart-7)]",
  "bg-[var(--chart-8)]",
];

export function BreakdownBarList({
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

  const max = Math.max(...nonZero.map((r) => r.value));

  return (
    <ul className="space-y-3">
      {nonZero.map((row, index) => {
        const pct = max > 0 ? (row.value / max) * 100 : 0;
        const barClass = categorical
          ? SLOT_COLORS[index % SLOT_COLORS.length]
          : "bg-[var(--chart-1)]";

        return (
          <li
            key={row.label}
            className="grid grid-cols-[5.75rem_minmax(0,1fr)_5.5rem] items-center gap-3"
          >
            <span
              className="truncate text-right text-xs font-medium text-muted-foreground"
              title={row.label}
            >
              {row.label}
            </span>
            <div className="h-5 overflow-hidden rounded-full bg-muted/80">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barClass)}
                style={{ width: `${Math.max(pct, row.value > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className="font-figures text-right text-xs font-semibold tabular-nums">
              {formatFcfa(row.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
