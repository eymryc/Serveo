"use client";

import { startOfDay } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/date-range-picker";
import {
  resolvePeriodSelection,
  toDateInputValue,
  type PeriodPreset,
  type PeriodSelection,
} from "@/lib/dashboard-math";
import { cn } from "@/lib/utils";

const PRESETS: { key: PeriodPreset; label: string; short: string }[] = [
  { key: "today", label: "Aujourd'hui", short: "Jour" },
  { key: "week", label: "Cette semaine", short: "Semaine" },
  { key: "month", label: "Ce mois", short: "Mois" },
  { key: "year", label: "Cette année", short: "Année" },
];

function selectPreset(preset: PeriodPreset): PeriodSelection {
  // Matérialise l'intervalle résolu pour que le date picker affiche
  // immédiatement les bornes du preset (tout en gardant le preset actif).
  const { from, to } = resolvePeriodSelection({ preset });
  return {
    preset,
    customFrom: toDateInputValue(from),
    customTo: toDateInputValue(to),
  };
}

function PresetSegment({
  value,
  onChange,
  className,
}: {
  value: PeriodSelection;
  onChange: (value: PeriodSelection) => void;
  className?: string;
}) {
  const isCustom = value.preset === "custom";

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 rounded-lg bg-muted/70 p-1",
        className
      )}
      role="tablist"
      aria-label="Période"
    >
      {PRESETS.map((p) => {
        const active = !isCustom && value.preset === p.key;
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(selectPreset(p.key))}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="md:hidden">{p.short}</span>
            <span className="hidden md:inline">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PeriodSelector({
  value,
  onChange,
  layout = "inline",
}: {
  value: PeriodSelection;
  onChange: (value: PeriodSelection) => void;
  layout?: "inline" | "bar";
}) {
  const isCustom = value.preset === "custom";
  const { from, to } = resolvePeriodSelection(value);
  const today = startOfDay(new Date());

  function applyCustomRange(range: { from: Date; to: Date }) {
    onChange({
      preset: "custom",
      customFrom: toDateInputValue(range.from),
      customTo: toDateInputValue(range.to),
    });
  }

  const rangePicker = (
    <DateRangePicker
      from={from}
      to={to}
      onChange={applyCustomRange}
      maxDate={today}
      className="w-full md:w-auto md:min-w-[16rem]"
    />
  );

  if (layout === "bar") {
    return (
      <div className="flex flex-col gap-3 border border-border bg-card px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
        <div className="hidden md:block">
          <PresetSegment value={value} onChange={onChange} />
        </div>

        <div className="md:hidden">
          <Select
            value={isCustom ? "custom" : value.preset}
            onValueChange={(v) => {
              if (v === "custom") {
                onChange({
                  preset: "custom",
                  customFrom: toDateInputValue(from),
                  customTo: toDateInputValue(to),
                });
              } else {
                onChange(selectPreset(v as PeriodPreset));
              }
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Choisir une période" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Période personnalisée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="hidden h-6 w-px shrink-0 bg-border md:block" aria-hidden />

        {rangePicker}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <div className="w-full sm:hidden">
          <Select
            value={isCustom ? "custom" : value.preset}
            onValueChange={(v) => {
              if (v === "custom") {
                onChange({
                  preset: "custom",
                  customFrom: toDateInputValue(from),
                  customTo: toDateInputValue(to),
                });
              } else {
                onChange(selectPreset(v as PeriodPreset));
              }
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Période personnalisée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PresetSegment value={value} onChange={onChange} className="hidden sm:inline-flex" />

        <DateRangePicker
          from={from}
          to={to}
          onChange={applyCustomRange}
          maxDate={today}
          className="w-full sm:w-auto sm:min-w-[16rem]"
        />
      </div>
    </div>
  );
}
