"use client";

import { useState } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
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

export function DatePicker({
  value,
  onChange,
  maxDate,
  minDate,
  id,
  className,
  placeholder = "Choisir une date",
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = startOfToday();
  const selected = startOfDay(value);

  const presets = [
    { label: "Aujourd'hui", date: today },
    {
      label: "Hier",
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
    },
    {
      label: "Il y a 7 jours",
      date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
    },
  ].filter((p) => {
    if (maxDate && p.date > startOfDay(maxDate)) return false;
    if (minDate && p.date < startOfDay(minDate)) return false;
    return true;
  });

  function pick(date: Date | undefined) {
    if (!date) return;
    onChange(startOfDay(date));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-start gap-2 rounded-none border-border px-3 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {value
              ? format(value, "EEEE d MMMM yyyy", { locale: fr })
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto overflow-hidden rounded-none border-border p-0 shadow-lg"
      >
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-border bg-muted/40 px-3 py-2.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => pick(p.date)}
                className={cn(
                  "h-8 border px-2.5 text-[11px] font-medium transition-colors",
                  isSameDay(selected, p.date)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <Calendar
          mode="single"
          locale={fr}
          selected={selected}
          onSelect={pick}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={maxDate ? startOfDay(maxDate) : new Date(today.getFullYear() + 1, 11)}
          disabled={(date) => {
            const d = startOfDay(date);
            if (maxDate && d > startOfDay(maxDate)) return true;
            if (minDate && d < startOfDay(minDate)) return true;
            return false;
          }}
          className="rounded-none"
        />
      </PopoverContent>
    </Popover>
  );
}
