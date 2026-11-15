"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

type Entry = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  viaSupport: boolean;
  actorName: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  "sale.cancel": "Vente annulee",
  "stock.reverse": "Mouvement de stock annule",
  "inventory.complete": "Inventaire cloture",
  "cash_session.close": "Caisse cloturee",
  "organization.create": "Bar cree",
  "organization.update": "Parametres modifies",
  "team.create": "Membre ajoute",
  "team.role_change": "Role modifie",
  "team.remove": "Membre retire",
  "team.password_reset": "Mot de passe redefini",
  "admin.user_create": "Compte cree (support)",
  "admin.user_update": "Compte modifie (support)",
  "admin.organization_update": "Bar modifie (support)",
  "impersonation.start": "Connexion du support",
  "impersonation.stop": "Fin de connexion du support",
};

const ROLE_LABELS: Record<string, string> = { admin: "gerant", member: "barman" };

function describe(entry: Entry) {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case "sale.cancel": {
      const parts = [`${formatFcfa(Number(m.netTotal ?? 0))}`, `${m.lines} ligne(s)`];
      if (m.reason) parts.push(`motif : ${m.reason}`);
      return parts.join(" · ");
    }
    case "inventory.complete":
      return `${m.adjustedLines} article(s) ajuste(s), ecart net ${m.netVariance}`;
    case "cash_session.close":
      return m.note ? `Note : ${m.note}` : "";
    case "team.create":
    case "team.role_change":
      return m.role ? `Role : ${ROLE_LABELS[String(m.role)] ?? m.role}` : "";
    case "stock.reverse":
      return `${m.lines} ligne(s)`;
    default:
      return "";
  }
}

function fetchPage(before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return apiFetch<{ entries: Entry[]; hasMore: boolean }>(`/api/v1/audit-logs${query}`);
}

export function JournalClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchPage()
      .then((data) => {
        setEntries(data.entries);
        setHasMore(data.hasMore);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    const last = entries[entries.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(last.createdAt);
      setEntries((prev) => [...prev, ...data.entries]);
      setHasMore(data.hasMore);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal"
        description="Qui a annule une vente, cloture la caisse ou modifie l'equipe, et quand. Les entrees ne peuvent pas etre modifiees."
      />

      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead className="border-b border-border bg-muted/60">
            <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              <th className="px-4 py-2.5 font-semibold sm:px-5">Date</th>
              <th className="px-4 py-2.5 font-semibold">Action</th>
              <th className="px-4 py-2.5 font-semibold">Par</th>
              <th className="px-4 py-2.5 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground sm:px-5">
                  {new Date(entry.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-4 py-3 font-semibold tracking-tight">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </td>
                <td className="px-4 py-3">
                  {entry.viaSupport ? "Support Serveo" : (entry.actorName ?? "Compte supprime")}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{describe(entry)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucune action enregistree pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Chargement…" : "Voir plus"}
        </Button>
      )}
    </div>
  );
}
