"use client";

import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type ErrorGroup = {
  fingerprint: string;
  occurrences: number;
  usersAffected: number;
  barsAffected: number;
  firstSeen: string;
  lastSeen: string;
  source: string;
  method: string | null;
  path: string | null;
  message: string;
  stack: string | null;
  barName: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  api: "API",
  render: "Page",
  web: "Navigateur",
  mobile: "Mobile",
};

const PERIODS = [1, 7, 30] as const;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminErrorsPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(7);
  const [groups, setGroups] = useState<ErrorGroup[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ groups: ErrorGroup[] }>(`/api/v1/admin/errors?days=${days}`)
      .then((d) => setGroups(d.groups))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur"));
  }, [days]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Erreurs"
        description="Erreurs inattendues remontees par l'API, le web et le mobile, regroupees par cause"
      />

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === days ? "default" : "secondary"}
            onClick={() => {
              setGroups(null);
              setDays(p);
            }}
          >
            {p === 1 ? "24 h" : `${p} jours`}
          </Button>
        ))}
      </div>

      {!groups ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead className="border-b border-border bg-muted/80">
              <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Erreur</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5 text-right">Occurrences</th>
                <th className="px-4 py-2.5 text-right">Bars</th>
                <th className="px-4 py-2.5 text-right">Derniere</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.fingerprint}>
                  <tr
                    className="cursor-pointer border-b border-border hover:bg-muted/40"
                    onClick={() => setExpanded(expanded === g.fingerprint ? null : g.fingerprint)}
                  >
                    <td className="max-w-md px-4 py-2.5">
                      <p className="truncate font-semibold">{g.message}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[g.method, g.path].filter(Boolean).join(" ") || "—"}
                        {g.barName ? ` · ${g.barName}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{SOURCE_LABELS[g.source] ?? g.source}</td>
                    <td
                      className={cn(
                        "font-figures px-4 py-2.5 text-right",
                        g.occurrences >= 10 && "font-semibold text-destructive"
                      )}
                    >
                      {g.occurrences}
                    </td>
                    <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                      {g.barsAffected}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {formatWhen(g.lastSeen)}
                    </td>
                  </tr>
                  {expanded === g.fingerprint && (
                    <tr className="border-b border-border bg-muted/30">
                      <td colSpan={5} className="px-4 py-3">
                        <p className="mb-2 text-xs text-muted-foreground">
                          Premiere occurrence : {formatWhen(g.firstSeen)} · {g.usersAffected} utilisateur(s)
                        </p>
                        <pre className="max-h-80 overflow-auto text-xs whitespace-pre-wrap">
                          {g.stack ?? g.message}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Aucune erreur sur la periode.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
