"use client";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PeriodKey } from "@/lib/types";

const PERIODS: { key: PeriodKey; label: string; short: string }[] = [
  { key: "today", label: "Aujourd'hui", short: "Jour" },
  { key: "week", label: "Cette semaine", short: "Semaine" },
  { key: "month", label: "Ce mois", short: "Mois" },
  { key: "year", label: "Cette annee", short: "Annee" },
];

export function PeriodSelector({ value, onChange }: { value: PeriodKey; onChange: (key: PeriodKey) => void }) {
  return (
    <>
      <div className="sm:hidden">
        <Select value={value} onValueChange={(v) => onChange(v as PeriodKey)}>
          <SelectTrigger className="h-11 w-[9.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden overflow-x-auto scroll-touch scrollbar-none sm:inline-flex sm:max-w-full">
        <div className="inline-flex gap-1 rounded-md border border-border bg-muted/40 p-1">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(p.key)}
              className={cn(
                "min-h-9 shrink-0 rounded-sm",
                value === p.key &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
            >
              <span className="md:hidden">{p.short}</span>
              <span className="hidden md:inline">{p.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}
