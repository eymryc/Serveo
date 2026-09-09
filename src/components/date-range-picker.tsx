"use client";

import { useEffect, useState } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DateRangePickerProps = {
  from: Date;
  to: Date;
  onChange: (range: { from: Date; to: Date }) => void;
  /** Désactive les dates après cette borne (ex. aujourd'hui). */
  maxDate?: Date;
  /** Désactive les dates avant cette borne. */
  minDate?: Date;
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

function startOfToday() {
  return startOfDay(new Date());
}

function formatRangeLabel(from: Date, to: Date) {
  if (isSameDay(from, to)) {
    return format(from, "d MMM yyyy", { locale: fr });
  }
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  if (sameMonth) {
    return `${format(from, "d", { locale: fr })} – ${format(to, "d MMM yyyy", { locale: fr })}`;
  }
  if (sameYear) {
    return `${format(from, "d MMM", { locale: fr })} – ${format(to, "d MMM yyyy", { locale: fr })}`;
  }
  return `${format(from, "d MMM yyyy", { locale: fr })} – ${format(to, "d MMM yyyy", { locale: fr })}`;
}

function normalizeRange(from: Date, to: Date) {
  let nextFrom = startOfDay(from);
  let nextTo = startOfDay(to);
  if (nextFrom.getTime() > nextTo.getTime()) {
    [nextFrom, nextTo] = [nextTo, nextFrom];
  }
  return { from: nextFrom, to: nextTo };
}

export function DateRangePicker({
  from,
  to,
  onChange,
  maxDate,
  minDate,
  id,
  className,
  placeholder = "Choisir une période",
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(1);
  // react-day-picker pose from=to au 1er clic : on ignore ça et on attend
  // explicitement un 2e clic avant d'appeler onChange (sinon le dashboard recharge).
  const [pickingEnd, setPickingEnd] = useState(false);
  const today = startOfToday();
  const selectedFrom = startOfDay(from);
  const selectedTo = startOfDay(to);
  const fromKey = selectedFrom.getTime();
  const toKey = selectedTo.getTime();
  const [draft, setDraft] = useState<DateRange>({ from: selectedFrom, to: selectedTo });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setMonths(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) {
      setDraft({ from: new Date(fromKey), to: new Date(toKey) });
      setPickingEnd(false);
    }
  }, [open, fromKey, toKey]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPickingEnd(false);
      setDraft({ from: new Date(fromKey), to: new Date(toKey) });
    }
  }

  function handleSelect(_range: DateRange | undefined, triggerDate: Date) {
    const day = startOfDay(triggerDate);

    if (!pickingEnd) {
      // 1er clic : début seulement, ne propage pas au parent.
      setDraft({ from: day, to: undefined });
      setPickingEnd(true);
      return;
    }

    // 2e clic : intervalle complet → on propage et on ferme.
    const start = draft.from ?? day;
    const next = normalizeRange(start, day);
    setDraft(next);
    setPickingEnd(false);
    onChange(next);
    setOpen(false);
  }

  const previewFrom = draft.from ?? selectedFrom;
  const waitingForEnd = pickingEnd;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 rounded-md border-input px-3 font-normal",
            !from && "text-muted-foreground",
            className
          )}
        >
          <CalendarRange className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
          <span className="font-figures truncate text-sm">
            {from && to ? formatRangeLabel(selectedFrom, selectedTo) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border-border p-0 shadow-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-border bg-muted/40 px-3 py-2.5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Intervalle
          </p>
          <p className="font-figures mt-1 text-sm font-medium">
            {format(previewFrom, "EEEE d MMMM yyyy", { locale: fr })}
            <span className="mx-1.5 text-muted-foreground">→</span>
            {waitingForEnd
              ? "Choisir la fin"
              : format(draft.to ?? selectedTo, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <Calendar
          mode="range"
          locale={fr}
          selected={draft}
          onSelect={handleSelect}
          defaultMonth={selectedFrom}
          numberOfMonths={months}
          captionLayout="dropdown"
          startMonth={minDate ? startOfDay(minDate) : new Date(2020, 0)}
          endMonth={maxDate ? startOfDay(maxDate) : new Date(today.getFullYear() + 1, 11)}
          disabled={(date) => {
            const d = startOfDay(date);
            if (maxDate && d > startOfDay(maxDate)) return true;
            if (minDate && d < startOfDay(minDate)) return true;
            return false;
          }}
          className="rounded-none"
        />
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          Cliquez une date de début, puis une date de fin
          {waitingForEnd ? " (fin en cours…)" : ""}.
        </p>
      </PopoverContent>
    </Popover>
  );
}
