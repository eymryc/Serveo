"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PeriodKey } from "@/lib/types";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "year", label: "Cette annee" },
];

export function PeriodSelector({ value, onChange }: { value: PeriodKey; onChange: (key: PeriodKey) => void }) {
  return (
    <div className="inline-flex border border-border">
      {PERIODS.map((p) => (
        <Button
          key={p.key}
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange(p.key)}
          className={cn(
            "rounded-none border-r border-border last:border-r-0",
            value === p.key && "bg-accent text-accent-foreground"
          )}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
