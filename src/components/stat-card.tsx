import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "good" | "bad" | "warn";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-foreground",
  good: "text-success",
  bad: "text-destructive",
  warn: "text-warning",
};

function Delta({ deltaPct, upIsGood = true }: { deltaPct: number | null; upIsGood?: boolean }) {
  if (deltaPct === null) return null;
  const isUp = deltaPct >= 0;
  const good = isUp === upIsGood;
  const Icon = isUp ? ArrowUp : ArrowDown;
  return (
    <span className={cn("font-figures inline-flex items-center gap-0.5 text-xs", good ? "text-success" : "text-destructive")}>
      <Icon className="size-3" />
      {Math.abs(deltaPct).toFixed(1)}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  deltaPct,
  deltaLabel = "vs periode precedente",
  upIsGood = true,
  className,
  style,
  size = "default",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: Tone;
  deltaPct?: number | null;
  deltaLabel?: string;
  upIsGood?: boolean;
  className?: string;
  style?: React.CSSProperties;
  size?: "default" | "hero";
}) {
  if (size === "hero") {
    return (
      <div
        className={cn(
          "flex flex-col justify-between border border-border bg-card p-6 md:p-8",
          className
        )}
        style={style}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {label}
          </p>
          {Icon && <Icon className="size-5 text-primary" strokeWidth={1.75} />}
        </div>
        <div className="mt-6">
          <p className={cn("font-figures text-4xl font-bold tracking-tight md:text-5xl", TONE_TEXT[tone])}>
            {value}
          </p>
          {deltaPct !== undefined && deltaPct !== null && (
            <div className="mt-3 flex items-center gap-2">
              <Delta deltaPct={deltaPct} upIsGood={upIsGood} />
              <span className="text-xs text-muted-foreground">{deltaLabel}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border border-border bg-card p-4 transition-colors hover:border-primary/30",
        className
      )}
      style={style}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      </div>
      <div>
        <p className={cn("font-figures text-2xl font-bold tracking-tight", TONE_TEXT[tone])}>{value}</p>
        {deltaPct !== undefined && deltaPct !== null && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <Delta deltaPct={deltaPct} upIsGood={upIsGood} />
            <span className="text-[11px] text-muted-foreground">{deltaLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
