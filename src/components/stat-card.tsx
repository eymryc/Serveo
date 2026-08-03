import type { LucideIcon } from "lucide-react";
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

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: Tone;
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
