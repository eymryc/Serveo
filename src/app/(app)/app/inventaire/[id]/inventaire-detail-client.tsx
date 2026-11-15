"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Pencil,
  Search,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { InventoryLine, InventorySession } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import {
  DataEmpty,
  DataTable,
  DataTableHead,
  DataTd,
  DataTh,
  DataTr,
  StatusBadge,
} from "@/components/data-table";

function toDateInputValue(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InventaireDetailClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<InventorySession | null>(null);
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [editDate, setEditDate] = useState("");
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ session: InventorySession; lines: InventoryLine[] }>(
        `/api/v1/inventory-sessions/${sessionId}`
      );
      setSession(data.session);
      setEditDate(toDateInputValue(data.session.inventoryDate));
      setLines(data.lines);
      const next: Record<string, string> = {};
      for (const l of data.lines) next[l.productId] = String(l.countedQty);
      setCounts(next);
      setDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inventaire introuvable");
      router.replace("/app/inventaire");
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- charge le detail au montage / changement d'id
    load();
  }, [load]);

  const filteredLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter((l) => (l.productName ?? "").toLowerCase().includes(q));
  }, [lines, search]);

  const stats = useMemo(() => {
    let surplus = 0;
    let shortage = 0;
    let withVariance = 0;
    for (const l of lines) {
      const counted =
        session?.status === "draft"
          ? Math.max(0, Math.floor(Number(counts[l.productId]) || 0))
          : l.countedQty;
      const variance = session?.status === "draft" ? counted - l.theoreticalQty : l.variance;
      if (variance !== 0) withVariance += 1;
      if (variance > 0) surplus += variance;
      if (variance < 0) shortage += Math.abs(variance);
    }
    return {
      articles: lines.length,
      withVariance,
      surplus,
      shortage,
    };
  }, [lines, counts, session?.status]);

  const dateDirty = !!session && toDateInputValue(session.inventoryDate) !== editDate;
  const isDraft = session?.status === "draft";

  async function handleSaveDate() {
    if (!session || !editDate || !dateDirty) return;
    setSubmitting(true);
    try {
      const { session: updated } = await apiFetch<{ session: InventorySession }>(
        `/api/v1/inventory-sessions/${sessionId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ inventoryDate: editDate }),
        }
      );
      setSession(updated);
      setEditDate(toDateInputValue(updated.inventoryDate));
      toast.success("Date mise a jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise a jour impossible");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveCounts() {
    if (!isDraft) return;
    setSubmitting(true);
    try {
      const payload = lines.map((l) => ({
        productId: l.productId,
        countedQty: Math.max(0, Math.floor(Number(counts[l.productId]) || 0)),
      }));
      await apiFetch(`/api/v1/inventory-sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ lines: payload }),
      });
      await load();
      toast.success("Comptages enregistres");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete() {
    if (!isDraft) return;
    if (dirty) {
      toast.error("Enregistrez d'abord les comptages");
      return;
    }
    const withVariance = lines.filter((l) => l.variance !== 0).length;
    if (
      !window.confirm(
        withVariance > 0
          ? `Cloturer et ajuster le stock sur ${withVariance} article(s) ?`
          : "Cloturer cet inventaire (aucun ecart) ?"
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/inventory-sessions/${sessionId}/complete`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success("Inventaire cloture — stock ajuste");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cloture impossible");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement de l&apos;inventaire…</p>;
  }

  if (!session) return null;

  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
          <Link href="/app/inventaire">
            <ArrowLeft className="size-4" />
            Retour aux inventaires
          </Link>
        </Button>

        <PageHeader
          title={`Inventaire du ${formatDate(session.inventoryDate)}`}
          description={
            isDraft
              ? "Saisissez les quantites comptees, enregistrez, puis cloturez pour ajuster le stock."
              : session.completedAt
                ? `Cloture le ${formatWhen(session.completedAt)}`
                : "Inventaire cloture"
          }
          action={
            isDraft ? (
              <StatusBadge tone="neutral">Brouillon</StatusBadge>
            ) : (
              <StatusBadge tone="good">Cloture</StatusBadge>
            )
          }
        />
      </div>

      {session.note && (
        <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Note — </span>
          {session.note}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Articles" value={String(stats.articles)} />
        <StatCard
          label="Avec ecart"
          value={String(stats.withVariance)}
          hint={stats.withVariance > 0 ? "A verifier" : "Aucun ecart"}
          tone={stats.withVariance > 0 ? "warn" : "ok"}
        />
        <StatCard
          label="Surplus"
          value={stats.surplus > 0 ? `+${stats.surplus}` : "0"}
          tone={stats.surplus > 0 ? "ok" : "neutral"}
        />
        <StatCard
          label="Manques"
          value={stats.shortage > 0 ? `−${stats.shortage}` : "0"}
          tone={stats.shortage > 0 ? "bad" : "neutral"}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1 space-y-1.5">
            <Label htmlFor="inv-detail-date" className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              Date de l&apos;inventaire
            </Label>
            <Input
              id="inv-detail-date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveDate} disabled={submitting || !dateDirty || !editDate}>
            <Pencil className="size-4" />
            Enregistrer la date
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-primary" />
            <h2 className="font-semibold tracking-tight">Comptage</h2>
            {isDraft && dirty && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlert className="size-3.5" />
                Modifications non enregistrees
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filtrer un article…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <DataTable minWidth="36rem" className="border-0">
          <DataTableHead>
            <tr>
              <DataTh>Article</DataTh>
              <DataTh align="right">Théorique</DataTh>
              <DataTh align="right">Compté</DataTh>
              <DataTh align="right">Écart</DataTh>
            </tr>
          </DataTableHead>
          <tbody>
            {filteredLines.map((l) => {
              const counted = Math.max(0, Math.floor(Number(counts[l.productId]) || 0));
              const variance = isDraft ? counted - l.theoreticalQty : l.variance;
              return (
                <DataTr key={l.id}>
                  <DataTd className="truncate font-semibold tracking-tight" title={l.productName}>
                    {l.productName}
                  </DataTd>
                  <DataTd align="right" figures muted>
                    {l.theoreticalQty}
                  </DataTd>
                  <DataTd align="right">
                    {isDraft ? (
                      <Input
                        className="ml-auto h-9 w-24 text-right"
                        type="number"
                        min={0}
                        value={counts[l.productId] ?? "0"}
                        onChange={(e) => {
                          setCounts((prev) => ({
                            ...prev,
                            [l.productId]: e.target.value,
                          }));
                          setDirty(true);
                        }}
                      />
                    ) : (
                      <span className="font-figures font-medium">{l.countedQty}</span>
                    )}
                  </DataTd>
                  <DataTd
                    align="right"
                    figures
                    className={cn(
                      "font-semibold",
                      variance > 0 && "text-success",
                      variance < 0 && "text-destructive",
                      variance === 0 && "text-muted-foreground"
                    )}
                  >
                    {variance > 0 ? `+${variance}` : variance}
                  </DataTd>
                </DataTr>
              );
            })}
            {filteredLines.length === 0 ? (
              <DataEmpty colSpan={4}>Aucun article ne correspond au filtre.</DataEmpty>
            ) : null}
          </tbody>
        </DataTable>
      </section>

      {isDraft && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <p className="text-sm text-muted-foreground">
              {stats.withVariance} ecart(s) · {stats.articles} article(s)
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleSaveCounts}
                disabled={submitting || !dirty}
              >
                Enregistrer les comptages
              </Button>
              <Button onClick={handleComplete} disabled={submitting || dirty}>
                Cloturer et ajuster le stock
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "bad";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tracking-tight tabular-nums",
          tone === "ok" && "text-success",
          tone === "warn" && "text-amber-700 dark:text-amber-400",
          tone === "bad" && "text-destructive"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
