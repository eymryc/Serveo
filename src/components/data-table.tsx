"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PAGE_SIZES = [10, 25, 50] as const;
export type SortDir = "asc" | "desc";

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    rows: items.slice(start, start + pageSize),
    total,
    pageCount,
    page: safePage,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  };
}

export function SortableTh({
  label,
  active,
  dir,
  onClick,
  align = "left",
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th className={cn("px-4 py-2.5 font-semibold", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          align === "right" && "ml-auto w-full justify-end",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    </th>
  );
}

export function TablePagination({
  from,
  to,
  total,
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: (typeof PAGE_SIZES)[number]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <p className="font-figures text-xs text-muted-foreground">
        {total === 0 ? "0 resultat" : `${from}–${to} sur ${total}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Par page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v) as (typeof PAGE_SIZES)[number])}
          >
            <SelectTrigger className="h-11 w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">Page precedente</span>
          </Button>
          <span className="font-figures min-w-16 text-center text-xs text-muted-foreground">
            {page}/{pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">Page suivante</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function KpiCell({
  label,
  value,
  tone = "default",
  icon,
  className,
  onClick,
  active,
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad";
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          "font-figures mt-1 text-xl font-bold tracking-tight sm:text-2xl",
          "truncate tabular-nums",
          tone === "bad" && "text-destructive",
          tone === "good" && "text-success"
        )}
      >
        {value}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40",
          active && "bg-primary/5 ring-1 ring-inset ring-primary",
          className
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={cn("bg-card px-4 py-3", className)}>{content}</div>;
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "good" | "bad" | "neutral" | "entry" | "exit";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        tone === "good" && "border-success/30 bg-success/10 text-success",
        tone === "bad" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "neutral" && "border-border bg-muted text-muted-foreground",
        tone === "entry" && "border-success/30 bg-success/10 text-success",
        tone === "exit" && "border-destructive/30 bg-destructive/10 text-destructive"
      )}
    >
      {children}
    </span>
  );
}
