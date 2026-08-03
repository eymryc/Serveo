import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "good" | "bad" | "warn";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-foreground",
  good: "text-success",
  bad: "text-destructive",
  warn: "text-warning",
};

const TONE_BORDER: Record<Tone, string> = {
  default: "border-l-border",
  good: "border-l-success",
  bad: "border-l-destructive",
  warn: "border-l-warning",
};

// delta : variation signee vs periode precedente. upIsGood inverse le
// code couleur pour les metriques ou une hausse est mauvaise (charges).
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
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: Tone;
  deltaPct?: number | null;
  deltaLabel?: string;
  upIsGood?: boolean;
}) {
  return (
    <Card className={cn("border-l-2", TONE_BORDER[tone])}>
      <CardContent className="flex items-start justify-between gap-2 pt-2">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className={cn("font-figures mt-1 truncate text-2xl font-semibold", TONE_TEXT[tone])}>
            {value}
          </div>
          {deltaPct !== undefined && deltaPct !== null && (
            <div className="mt-1 flex items-center gap-1">
              <Delta deltaPct={deltaPct} upIsGood={upIsGood} />
              <span className="text-xs text-muted-foreground">{deltaLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}
