"use client";

import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminTable,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin-ui";
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
    <div className="space-y-8">
      <AdminPageHeader
        title="Erreurs"
        description="Incidents regroupés par cause — API, web et mobile."
        action={
          <div className="flex gap-1.5 rounded-sm border border-border bg-card p-1">
            {PERIODS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={p === days ? "default" : "ghost"}
                className="h-8 px-3"
                onClick={() => {
                  setGroups(null);
                  setExpanded(null);
                  setDays(p);
                }}
              >
                {p === 1 ? "24 h" : `${p} j`}
              </Button>
            ))}
          </div>
        }
      />

      <AdminPanel>
        {!groups ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <AdminTable minWidth="48rem">
            <AdminTableHead>
              <tr>
                <AdminTh>Erreur</AdminTh>
                <AdminTh>Source</AdminTh>
                <AdminTh align="right">Occurrences</AdminTh>
                <AdminTh align="right">Bars</AdminTh>
                <AdminTh align="right">Dernière</AdminTh>
              </tr>
            </AdminTableHead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.fingerprint}>
                  <AdminTr
                    onClick={() =>
                      setExpanded(expanded === g.fingerprint ? null : g.fingerprint)
                    }
                  >
                    <AdminTd className="max-w-md">
                      <p className="truncate font-semibold tracking-tight">{g.message}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[g.method, g.path].filter(Boolean).join(" ") || "—"}
                        {g.barName ? ` · ${g.barName}` : ""}
                      </p>
                    </AdminTd>
                    <AdminTd className="text-xs font-semibold tracking-wide uppercase" muted>
                      {SOURCE_LABELS[g.source] ?? g.source}
                    </AdminTd>
                    <AdminTd
                      align="right"
                      figures
                      className={cn(g.occurrences >= 10 && "font-semibold text-destructive")}
                    >
                      {g.occurrences}
                    </AdminTd>
                    <AdminTd align="right" figures muted>
                      {g.barsAffected}
                    </AdminTd>
                    <AdminTd align="right" className="text-xs" muted>
                      {formatWhen(g.lastSeen)}
                    </AdminTd>
                  </AdminTr>
                  {expanded === g.fingerprint ? (
                    <tr className="border-b border-border bg-muted/40">
                      <td colSpan={5} className="px-4 py-4">
                        <p className="mb-3 text-xs text-muted-foreground">
                          Première occurrence : {formatWhen(g.firstSeen)} ·{" "}
                          {g.usersAffected} utilisateur(s)
                        </p>
                        <pre className="max-h-80 overflow-auto border border-border/70 bg-background/80 p-3 font-mono text-xs whitespace-pre-wrap">
                          {g.stack ?? g.message}
                        </pre>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {groups.length === 0 ? (
                <AdminEmpty colSpan={5}>Aucune erreur sur la période.</AdminEmpty>
              ) : null}
            </tbody>
          </AdminTable>
        )}
      </AdminPanel>
    </div>
  );
}
