import { cn } from "@/lib/utils";
import {
  DataEmpty,
  DataTable,
  DataTableHead,
  DataTd,
  DataTh,
  DataTr,
} from "@/components/data-table";

/** En-tête éditorial des pages back-office. */
export function AdminPageHeader({
  eyebrow = "Plateforme",
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
        "admin-reveal flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-6",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
          {eyebrow}
        </p>
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

export function AdminKpi({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
  className?: string;
}) {
  return (
    <div className={cn("admin-kpi space-y-2 bg-card px-4 py-4 sm:px-5 sm:py-5", className)}>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-figures text-[1.55rem] leading-none font-bold tracking-tight sm:text-[1.75rem]",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
          tone === "default" && "text-foreground"
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function AdminKpiStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "admin-reveal overflow-hidden border border-border/80 bg-border divide-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("admin-reveal space-y-4", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Alias vers le système de tables partagé. */
export function AdminTable({
  children,
  className,
  minWidth = "40rem",
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <DataTable className={className} minWidth={minWidth}>
      {children}
    </DataTable>
  );
}

export const AdminTh = DataTh;
export const AdminTd = DataTd;
export const AdminTr = DataTr;
export const AdminTableHead = DataTableHead;
export const AdminEmpty = DataEmpty;

export function AdminStatus({
  active,
  activeLabel = "Actif",
  inactiveLabel = "Désactivé",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold",
        active ? "text-success" : "text-destructive"
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          active ? "bg-success" : "bg-destructive"
        )}
        aria-hidden
      />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

