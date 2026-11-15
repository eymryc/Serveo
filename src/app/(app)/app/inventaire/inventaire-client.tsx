"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ClipboardCheck, Eye, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { InventorySession } from "@/lib/types";
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
import { PageHeader } from "@/components/page-header";
import {
  DataTable,
  DataTableHead,
  DataTd,
  DataTh,
  DataTr,
  StatusBadge,
} from "@/components/data-table";

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

export default function InventairePageClient() {
  const router = useRouter();
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [createDate, setCreateDate] = useState(todayInputValue);
  const [createOpen, setCreateOpen] = useState(false);
  const [dateEditSession, setDateEditSession] = useState<InventorySession | null>(null);
  const [listEditDate, setListEditDate] = useState("");

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

  async function handleCreate() {
    setSubmitting(true);
    try {
      const result = await apiFetch<{ session: InventorySession }>(
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
      router.push(`/app/inventaire/${result.session.id}`);
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

  async function handleSaveListDate() {
    if (!dateEditSession || !listEditDate) return;
    if (toDateInputValue(dateEditSession.inventoryDate) === listEditDate) {
      setDateEditSession(null);
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch<{ session: InventorySession }>(
        `/api/v1/inventory-sessions/${dateEditSession.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ inventoryDate: listEditDate }),
        }
      );
      setDateEditSession(null);
      await loadSessions();
      toast.success("Date mise a jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise a jour impossible");
    } finally {
      setSubmitting(false);
    }
  }

  const draft = sessions.find((s) => s.status === "draft");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestion"
        title="Inventaire"
        description="Comptez le stock physique, comparez au théorique, puis ajustez les écarts."
        action={
          <Button onClick={() => setCreateOpen(true)} disabled={!!draft}>
            <Plus className="size-4" />
            Nouvel inventaire
          </Button>
        }
      />

      {draft && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          Un inventaire est en cours —{" "}
          <Link
            href={`/app/inventaire/${draft.id}`}
            className="font-semibold underline underline-offset-2"
          >
            ouvrez-le
          </Link>{" "}
          pour continuer avant d&apos;en creer un autre.
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
        <DataTable minWidth="40rem">
          <DataTableHead>
            <tr>
              <DataTh>Date</DataTh>
              <DataTh>Note</DataTh>
              <DataTh>Statut</DataTh>
              <DataTh>Actions</DataTh>
            </tr>
          </DataTableHead>
          <tbody>
            {sessions.map((s) => (
              <DataTr key={s.id}>
                <DataTd figures className="font-semibold whitespace-nowrap">
                  {formatDate(s.inventoryDate)}
                </DataTd>
                <DataTd muted className="truncate" title={s.note || undefined}>
                  {s.note || "—"}
                </DataTd>
                <DataTd>
                  {s.status === "draft" ? (
                    <StatusBadge tone="neutral">Brouillon</StatusBadge>
                  ) : (
                    <StatusBadge tone="good">Clôturé</StatusBadge>
                  )}
                </DataTd>
                <DataTd>
                  <div className="flex flex-nowrap items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <Link href={`/app/inventaire/${s.id}`}>
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
                      </Link>
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
                </DataTd>
              </DataTr>
            ))}
          </tbody>
        </DataTable>
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
    </div>
  );
}
