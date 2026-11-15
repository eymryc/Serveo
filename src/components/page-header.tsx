import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow = "Serveo",
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[1.85rem] leading-none font-bold tracking-tight text-foreground sm:text-[2.35rem]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}
