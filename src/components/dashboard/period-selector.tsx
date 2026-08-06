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
    <div className="inline-flex gap-1 rounded-md border border-border bg-muted/40 p-1">
      {PERIODS.map((p) => (
        <Button
          key={p.key}
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange(p.key)}
          className={cn(
            "rounded-sm",
            value === p.key && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          )}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
