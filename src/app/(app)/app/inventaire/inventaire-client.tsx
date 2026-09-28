"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardCheck, Eye, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { InventoryLine, InventorySession } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/data-table";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InventairePageClient() {
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [createDate, setCreateDate] = useState(todayInputValue);
  const [createOpen, setCreateOpen] = useState(false);
  const [dateEditSession, setDateEditSession] = useState<InventorySession | null>(null);
  const [listEditDate, setListEditDate] = useState("");

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<InventorySession | null>(null);
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [editDate, setEditDate] = useState("");
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);

  async function loadSessions() {
    setLoading(true);
    try {
      const { sessions: rows } = await apiFetch<{ sessions: InventorySession[] }>(
        "/api/v1/inventory-sessions?limit=30"
      );
      setSessions(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inventaire");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- charge la liste au montage
    loadSessions();
  }, []);

  async function openSession(id: string) {
    setActiveId(id);
    try {
      const data = await apiFetch<{ session: InventorySession; lines: InventoryLine[] }>(
        `/api/v1/inventory-sessions/${id}`
      );
      setActiveSession(data.session);
      setEditDate(toDateInputValue(data.session.inventoryDate));
      setLines(data.lines);
      const next: Record<string, string> = {};
      for (const l of data.lines) next[l.productId] = String(l.countedQty);
      setCounts(next);
      setDirty(false);
      setSearch("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur detail");
      setActiveId(null);
    }
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      const result = await apiFetch<{ session: InventorySession; lines: InventoryLine[] }>(
        "/api/v1/inventory-sessions",
        {
          method: "POST",
          body: JSON.stringify({
            note: note.trim() || null,
            inventoryDate: createDate || undefined,
          }),
        }
      );
      toast.success("Inventaire demarre");
      setCreateOpen(false);
      setNote("");
      setCreateDate(todayInputValue());
      await loadSessions();
      await openSession(result.session.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation impossible");
    } finally {
      setSubmitting(false);
    }
  }

  function openDateEdit(session: InventorySession) {
    setDateEditSession(session);
    setListEditDate(toDateInputValue(session.inventoryDate));
  }

  async function patchInventoryDate(sessionId: string, inventoryDate: string) {
    const { session } = await apiFetch<{ session: InventorySession }>(
      `/api/v1/inventory-sessions/${sessionId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ inventoryDate }),
      }
    );
    return session;
  }

  async function handleSaveDate() {
    if (!activeId || !activeSession || !editDate) return;
    if (toDateInputValue(activeSession.inventoryDate) === editDate) return;
    setSubmitting(true);
    try {
      const session = await patchInventoryDate(activeId, editDate);
      setActiveSession(session);
      setEditDate(toDateInputValue(session.inventoryDate));
      await loadSessions();
      toast.success("Date mise a jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise a jour impossible");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveListDate() {
    if (!dateEditSession || !listEditDate) return;
    if (toDateInputValue(dateEditSession.inventoryDate) === listEditDate) {
      setDateEditSession(null);
      return;
    }
    setSubmitting(true);
    try {
      const session = await patchInventoryDate(dateEditSession.id, listEditDate);
      if (activeId === session.id) {
        setActiveSession(session);
        setEditDate(toDateInputValue(session.inventoryDate));
      }
      setDateEditSession(null);
      await loadSessions();
      toast.success("Date mise a jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise a jour impossible");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveCounts() {
    if (!activeId || activeSession?.status !== "draft") return;
    setSubmitting(true);
    try {
      const payload = lines.map((l) => ({
        productId: l.productId,
        countedQty: Math.max(0, Math.floor(Number(counts[l.productId]) || 0)),
      }));
      await apiFetch<{ lines: InventoryLine[] }>(
        `/api/v1/inventory-sessions/${activeId}`,
        { method: "PATCH", body: JSON.stringify({ lines: payload }) }
      );
      await openSession(activeId);
      toast.success("Comptages enregistres");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete() {
    if (!activeId || activeSession?.status !== "draft") return;
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
      await apiFetch(`/api/v1/inventory-sessions/${activeId}/complete`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success("Inventaire cloture — stock ajuste");
      setActiveId(null);
      setActiveSession(null);
      setLines([]);
      await loadSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cloture impossible");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter((l) => (l.productName ?? "").toLowerCase().includes(q));
  }, [lines, search]);

  const varianceCount = lines.filter((l) => l.variance !== 0).length;
  const draft = sessions.find((s) => s.status === "draft");
  const dateDirty =
    !!activeSession && toDateInputValue(activeSession.inventoryDate) !== editDate;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventaire"
        description="Comptez le stock physique, comparez au theorique, puis ajustez les ecarts."
        action={
          <Button onClick={() => setCreateOpen(true)} disabled={!!draft}>
            <Plus className="size-4" />
            Nouvel inventaire
          </Button>
        }
      />

      {draft && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          Un inventaire est en cours — ouvrez-le pour continuer avant d&apos;en creer un autre.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : sessions.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
          <ClipboardCheck className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="font-medium">Aucun inventaire</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Demarrez un inventaire pour figer le stock theorique et compter.
          </p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[40rem] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[28%]" />
              <col className="w-[16%]" />
              <col className="w-[38%]" />
            </colgroup>
            <thead className="border-b border-border bg-muted/40 text-[10px] tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Note</th>
                <th className="px-4 py-2.5 font-semibold">Statut</th>
                <th className="px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium whitespace-nowrap tabular-nums">
                    {formatDate(s.inventoryDate)}
                  </td>
                  <td className="truncate px-4 py-3 text-muted-foreground" title={s.note || undefined}>
                    {s.note || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {s.status === "draft" ? (
                      <StatusBadge tone="neutral">Brouillon</StatusBadge>
                    ) : (
                      <StatusBadge tone="good">Cloture</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-nowrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => openSession(s.id)}
                      >
                        {s.status === "draft" ? (
                          <>
                            <ClipboardCheck className="size-3.5" />
                            Continuer
                          </>
                        ) : (
                          <>
                            <Eye className="size-3.5" />
                            Voir
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => openDateEdit(s)}
                      >
                        <CalendarDays className="size-3.5" />
                        Modifier la date
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={!!dateEditSession}
        onOpenChange={(open) => {
          if (!open) setDateEditSession(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              Modifier la date
            </DialogTitle>
            <DialogDescription>
              Changez la date metier de l&apos;inventaire. Aucun impact sur le stock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <Label htmlFor="inv-list-date">Date de l&apos;inventaire</Label>
            <Input
              id="inv-list-date"
              type="date"
              required
              value={listEditDate}
              onChange={(e) => setListEditDate(e.target.value)}
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateEditSession(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveListDate}
              disabled={submitting || !listEditDate}
            >
              <Pencil className="size-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel inventaire</DialogTitle>
            <DialogDescription>
              Le stock actuel de chaque article actif sera fige comme quantite theorique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="inv-date">Date de l&apos;inventaire</Label>
              <Input
                id="inv-date"
                type="date"
                required
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-note">Note (optionnel)</Label>
              <Input
                id="inv-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex. inventaire mensuel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !createDate}>
              Demarrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={!!activeId}
        onOpenChange={(o) => {
          if (!o) {
            setActiveId(null);
            setActiveSession(null);
            setLines([]);
          }
        }}
      >
        <SheetContent className="flex w-full flex-col gap-4 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              Inventaire{" "}
              {activeSession ? formatDate(activeSession.inventoryDate) : ""}
            </SheetTitle>
            <SheetDescription>
              {activeSession?.status === "draft"
                ? `${varianceCount} ecart(s) · modifiez les quantites comptees`
                : `Cloture le ${
                    activeSession?.completedAt
                      ? formatWhen(activeSession.completedAt)
                      : "—"
                  }`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="min-w-[12rem] flex-1 space-y-1.5">
              <Label htmlFor="inv-edit-date" className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                Date de l&apos;inventaire
              </Label>
              <Input
                id="inv-edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="bg-background"
              />
            </div>
            <Button
              onClick={handleSaveDate}
              disabled={submitting || !dateDirty || !editDate}
            >
              <Pencil className="size-4" />
              Enregistrer la date
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filtrer un article…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[40%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead className="sticky top-0 bg-background text-[10px] tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 pr-2 text-left font-semibold">Article</th>
                  <th className="px-2 py-2 text-right font-semibold">Theorique</th>
                  <th className="px-2 py-2 text-right font-semibold">Compte</th>
                  <th className="py-2 pl-2 text-right font-semibold">Ecart</th>
                </tr>
              </thead>
              <tbody>
                {filteredLines.map((l) => {
                  const counted = Math.max(0, Math.floor(Number(counts[l.productId]) || 0));
                  const variance =
                    activeSession?.status === "draft"
                      ? counted - l.theoreticalQty
                      : l.variance;
                  return (
                    <tr key={l.id} className="border-t border-border">
                      <td className="truncate py-2 pr-2 font-medium" title={l.productName}>
                        {l.productName}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{l.theoreticalQty}</td>
                      <td className="px-2 py-2 text-right">
                        {activeSession?.status === "draft" ? (
                          <Input
                            className="ml-auto h-8 w-20 text-right"
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
                          <span className="tabular-nums">{l.countedQty}</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "py-2 pl-2 text-right tabular-nums font-semibold",
                          variance !== 0 && "text-amber-700 dark:text-amber-400"
                        )}
                      >
                        {variance > 0 ? `+${variance}` : variance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {activeSession?.status === "draft" && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                variant="outline"
                onClick={handleSaveCounts}
                disabled={submitting || !dirty}
              >
                Enregistrer
              </Button>
              <Button onClick={handleComplete} disabled={submitting || dirty}>
                Cloturer et ajuster le stock
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
