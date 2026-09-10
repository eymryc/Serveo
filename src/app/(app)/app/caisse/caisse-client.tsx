"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa, optionalDateInputToIso } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  type CashMethodTotals,
  type CashSession,
  type CashSessionSummary,
} from "@/lib/types";
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
import { PageHeader } from "@/components/page-header";
import { KpiCell, StatusBadge } from "@/components/data-table";

const METHOD_KEYS = [
  "especes",
  "orange_money",
  "mtn_momo",
  "wave",
  "carte_virement",
] as const;

type MethodKey = (typeof METHOD_KEYS)[number];

const COUNTED_BODY_KEYS: Record<MethodKey, string> = {
  especes: "countedEspeces",
  orange_money: "countedOrangeMoney",
  mtn_momo: "countedMtnMomo",
  wave: "countedWave",
  carte_virement: "countedCarteVirement",
};

function formatOpenedAt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sumTotals(t: CashMethodTotals) {
  return METHOD_KEYS.reduce((s, k) => s + (t[k] ?? 0), 0);
}

export default function CaissePageClient() {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [openSummary, setOpenSummary] = useState<CashSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [openedAtInput, setOpenedAtInput] = useState("");
  const [closedAtInput, setClosedAtInput] = useState("");
  const [counted, setCounted] = useState<Record<MethodKey, string>>({
    especes: "",
    orange_money: "",
    mtn_momo: "",
    wave: "",
    carte_virement: "",
  });
  const [closeNote, setCloseNote] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CashSessionSummary | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { sessions: rows } = await apiFetch<{ sessions: CashSession[] }>(
        "/api/v1/cash-sessions?limit=20"
      );
      setSessions(rows);
      const open = rows.find((s) => s.status === "open");
      if (open) {
        const summary = await apiFetch<CashSessionSummary>(`/api/v1/cash-sessions/${open.id}`);
        setOpenSummary(summary);
      } else {
        setOpenSummary(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur caisse");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch session caisse au montage, pattern volontaire
    load();
  }, []);

  useEffect(() => {
    if (!detailId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset detail quand le dialog se ferme
      setDetail(null);
      return;
    }
    apiFetch<CashSessionSummary>(`/api/v1/cash-sessions/${detailId}`)
      .then(setDetail)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Erreur detail"));
  }, [detailId]);

  const expected = openSummary?.expectedByMethod;
  const expectedTotal = expected ? sumTotals(expected) : 0;

  const closedHistory = useMemo(
    () => sessions.filter((s) => s.status === "closed"),
    [sessions]
  );

  async function handleOpen() {
    setSubmitting(true);
    try {
      const openedAt = optionalDateInputToIso(openedAtInput);
      await apiFetch("/api/v1/cash-sessions", {
        method: "POST",
        body: JSON.stringify({
          openingFloat: Number(openingFloat) || 0,
          ...(openedAt ? { openedAt } : {}),
        }),
      });
      toast.success("Caisse ouverte");
      setOpenDialog(false);
      setOpeningFloat("0");
      setOpenedAtInput("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'ouvrir");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    if (!openSummary) return;
    setSubmitting(true);
    try {
      const body: Record<string, number | string> = {};
      for (const key of METHOD_KEYS) {
        body[COUNTED_BODY_KEYS[key]] = Number(counted[key]) || 0;
      }
      if (closeNote.trim()) body.note = closeNote.trim();
      const closedAt = optionalDateInputToIso(closedAtInput);
      if (closedAt) body.closedAt = closedAt;

      const result = await apiFetch<CashSessionSummary>(
        `/api/v1/cash-sessions/${openSummary.session.id}/close`,
        { method: "POST", body: JSON.stringify(body) }
      );
      const varTotal = result.variances ? sumTotals(result.variances) : 0;
      toast.success(
        varTotal === 0
          ? "Caisse cloturee — ecart nul"
          : `Caisse cloturee — ecart ${formatFcfa(varTotal)}`
      );
      setCloseDialog(false);
      setCloseNote("");
      setClosedAtInput("");
      setCounted({
        especes: "",
        orange_money: "",
        mtn_momo: "",
        wave: "",
        carte_virement: "",
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de cloturer");
    } finally {
      setSubmitting(false);
    }
  }

  function prefillCountedFromExpected() {
    if (!expected) return;
    setCounted({
      especes: String(expected.especes),
      orange_money: String(expected.orange_money),
      mtn_momo: String(expected.mtn_momo),
      wave: String(expected.wave),
      carte_virement: String(expected.carte_virement),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caisse"
        description="Ouvrez la caisse avec un fond, vendez, puis cloturez en comptant chaque mode de paiement."
        action={
          openSummary ? (
            <Button onClick={() => { prefillCountedFromExpected(); setCloseDialog(true); }}>
              <Lock className="size-4" />
              Cloturer
            </Button>
          ) : (
            <Button onClick={() => setOpenDialog(true)}>
              <Unlock className="size-4" />
              Ouvrir la caisse
            </Button>
          )
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : openSummary && expected ? (
        <section className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Session ouverte</p>
              <p className="text-xs text-muted-foreground">
                Depuis {formatOpenedAt(openSummary.session.openedAt)} · fond{" "}
                {formatFcfa(Number(openSummary.session.openingFloat))}
              </p>
            </div>
            <StatusBadge tone="good">Ouverte</StatusBadge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCell label="Attendu total" value={formatFcfa(expectedTotal)} />
            {METHOD_KEYS.map((key) => (
              <KpiCell
                key={key}
                label={PAYMENT_METHOD_LABELS[key] ?? key}
                value={formatFcfa(expected[key])}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            L&apos;attendu = fond d&apos;ouverture (especes) + ventes + remboursements clients sur
            la session.
          </p>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
          <Banknote className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="font-medium">Aucune caisse ouverte</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ouvrez une session avant de commencer les ventes de la journee.
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Historique
        </h2>
        {closedHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pas encore de cloture.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-[10px] tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 font-semibold">Ouverture</th>
                  <th className="px-3 py-2 font-semibold">Cloture</th>
                  <th className="px-3 py-2 font-semibold">Fond</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {closedHistory.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">{formatOpenedAt(s.openedAt)}</td>
                    <td className="px-3 py-2.5">
                      {s.closedAt ? formatOpenedAt(s.closedAt) : "—"}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatFcfa(Number(s.openingFloat))}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button variant="ghost" size="sm" onClick={() => setDetailId(s.id)}>
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ouvrir la caisse</DialogTitle>
            <DialogDescription>
              Indiquez le fond de caisse en especes au demarrage (souvent 0).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="float">Fond d&apos;ouverture (FCFA)</Label>
              <Input
                id="float"
                type="number"
                min={0}
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opened-at">Date d&apos;ouverture (optionnel)</Label>
              <Input
                id="opened-at"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={openedAtInput}
                onChange={(e) => setOpenedAtInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Vide = maintenant. Utile si vous ouvrez la caisse en retard.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleOpen} disabled={submitting}>
              Ouvrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cloturer la caisse</DialogTitle>
            <DialogDescription>
              Comptez chaque mode et saisissez le montant reel. L&apos;ecart = compte − attendu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {METHOD_KEYS.map((key) => (
              <div key={key} className="grid grid-cols-[1fr_auto] items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`c-${key}`}>{PAYMENT_METHOD_LABELS[key]}</Label>
                  <Input
                    id={`c-${key}`}
                    type="number"
                    min={0}
                    value={counted[key]}
                    onChange={(e) => setCounted((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={expected ? String(expected[key]) : "0"}
                  />
                </div>
                <p className="pb-2 text-xs text-muted-foreground tabular-nums">
                  att. {expected ? formatFcfa(expected[key]) : "—"}
                </p>
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="close-note">Note (optionnel)</Label>
              <Input
                id="close-note"
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="Ex. ecart billets usés"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="closed-at">Date de cloture (optionnel)</Label>
              <Input
                id="closed-at"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={closedAtInput}
                onChange={(e) => setClosedAtInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Vide = maintenant.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleClose} disabled={submitting}>
              Confirmer la cloture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail de cloture</DialogTitle>
            <DialogDescription>
              {detail
                ? `${formatOpenedAt(detail.session.openedAt)} → ${
                    detail.session.closedAt ? formatOpenedAt(detail.session.closedAt) : "—"
                  }`
                : "Chargement…"}
            </DialogDescription>
          </DialogHeader>
          {detail?.expectedByMethod && detail.countedByMethod && detail.variances && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] tracking-wider text-muted-foreground uppercase">
                  <tr>
                    <th className="py-1 text-left">Mode</th>
                    <th className="py-1 text-right">Attendu</th>
                    <th className="py-1 text-right">Compte</th>
                    <th className="py-1 text-right">Ecart</th>
                  </tr>
                </thead>
                <tbody>
                  {METHOD_KEYS.map((key) => {
                    const v = detail.variances![key];
                    return (
                      <tr key={key} className="border-t border-border">
                        <td className="py-2">{PAYMENT_METHOD_LABELS[key]}</td>
                        <td className="py-2 text-right tabular-nums">
                          {formatFcfa(detail.expectedByMethod[key])}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatFcfa(detail.countedByMethod![key])}
                        </td>
                        <td
                          className={cn(
                            "py-2 text-right tabular-nums font-medium",
                            v !== 0 && "text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {formatFcfa(v)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {detail.session.note && (
                <p className="mt-3 text-sm text-muted-foreground">Note : {detail.session.note}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
