"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  DataEmpty,
  DataTable,
  DataTableHead,
  DataTd,
  DataTh,
  DataTr,
} from "@/components/data-table";
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Journal"
        description="Qui a annulé une vente, clôturé la caisse ou modifié l'équipe, et quand. Les entrées ne peuvent pas être modifiées."
      />

      <DataTable minWidth="40rem">
        <DataTableHead>
          <tr>
            <DataTh>Date</DataTh>
            <DataTh>Action</DataTh>
            <DataTh>Par</DataTh>
            <DataTh>Détail</DataTh>
          </tr>
        </DataTableHead>
        <tbody>
          {entries.map((entry) => (
            <DataTr key={entry.id}>
              <DataTd muted className="whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </DataTd>
              <DataTd className="font-semibold tracking-tight">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </DataTd>
              <DataTd>
                {entry.viaSupport ? "Support Serveo" : (entry.actorName ?? "Compte supprimé")}
              </DataTd>
              <DataTd muted>{describe(entry)}</DataTd>
            </DataTr>
          ))}
          {entries.length === 0 ? (
            <DataEmpty colSpan={4}>Aucune action enregistrée pour l&apos;instant.</DataEmpty>
          ) : null}
        </tbody>
      </DataTable>

      {hasMore && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Chargement…" : "Voir plus"}
        </Button>
      )}
    </div>
  );
}
