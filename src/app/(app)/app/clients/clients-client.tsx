"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa, optionalDateInputToIso } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  type Customer,
  type CustomerLedgerEntry,
  type Organization,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/page-header";
import { KpiCell, StatusBadge } from "@/components/data-table";

const REPAY_METHODS = [
  "especes",
  "orange_money",
  "mtn_momo",
  "wave",
  "carte_virement",
] as const;

export default function ClientsPageClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    customer: Customer;
    balance: number;
    ledger: CustomerLedgerEntry[];
  } | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<string>("especes");
  const [payNote, setPayNote] = useState("");
  const [payDateInput, setPayDateInput] = useState("");
  const [activePaymentMethods, setActivePaymentMethods] = useState<string[]>([...REPAY_METHODS]);

  async function load() {
    setLoading(true);
    try {
      const { customers: rows } = await apiFetch<{ customers: Customer[] }>("/api/v1/customers");
      setCustomers(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- charge clients + modes de paiement au montage
    load();
    apiFetch<{ organization: Organization }>("/api/v1/organization").then((d) => {
      const methods = d.organization.activePaymentMethods.filter((m) =>
        (REPAY_METHODS as readonly string[]).includes(m)
      );
      if (methods.length) {
        setActivePaymentMethods(methods);
        setPayMethod(methods[0]);
      }
    });
  }, []);

  async function openCustomer(id: string) {
    setSelectedId(id);
    setDetail(null);
    try {
      const data = await apiFetch<{
        customer: Customer;
        balance: number;
        ledger: CustomerLedgerEntry[];
      }>(`/api/v1/customers/${id}`);
      setDetail(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur detail client");
    }
  }

  async function loadDetail(id: string) {
    try {
      const data = await apiFetch<{
        customer: Customer;
        balance: number;
        ledger: CustomerLedgerEntry[];
      }>(`/api/v1/customers/${id}`);
      setDetail(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur detail client");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.note ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalDebt = customers.reduce((s, c) => s + Math.max(0, c.balance ?? 0), 0);
  const debtors = customers.filter((c) => (c.balance ?? 0) > 0).length;

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Nom requis");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          note: note.trim() || null,
        }),
      });
      toast.success("Client cree");
      setCreateOpen(false);
      setName("");
      setPhone("");
      setNote("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation impossible");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    if (!selectedId) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    setSubmitting(true);
    try {
      const paidAt = optionalDateInputToIso(payDateInput);
      await apiFetch(`/api/v1/customers/${selectedId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          paymentMethod: payMethod,
          note: payNote.trim() || null,
          ...(paidAt ? { paidAt } : {}),
        }),
      });
      toast.success(`Remboursement de ${formatFcfa(amount)}`);
      setPayOpen(false);
      setPayAmount("");
      setPayNote("");
      setPayDateInput("");
      await load();
      await loadDetail(selectedId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Paiement impossible");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients credit"
        description="Suivez qui doit de l'argent et enregistrez les remboursements."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nouveau client
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCell label="Clients" value={String(customers.length)} />
        <KpiCell label="Avec dette" value={String(debtors)} />
        <KpiCell label="Total du" value={formatFcfa(totalDebt)} />
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
          <UserRound className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="font-medium">Aucun client</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Creez un client pour vendre a credit.
          </p>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[10px] tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">Client</th>
                <th className="px-3 py-2 font-semibold">Telephone</th>
                <th className="px-3 py-2 font-semibold text-right">Solde</th>
                <th className="px-3 py-2 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const bal = c.balance ?? 0;
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
                    onClick={() => openCustomer(c.id)}
                  >
                    <td className="px-3 py-2.5 font-medium">{c.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.phone || "—"}</td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right tabular-nums font-semibold",
                        bal > 0 && "text-amber-700 dark:text-amber-400"
                      )}
                    >
                      {formatFcfa(bal)}
                    </td>
                    <td className="px-3 py-2.5">
                      {bal > 0 ? (
                        <StatusBadge tone="bad">Dette</StatusBadge>
                      ) : (
                        <StatusBadge tone="good">A jour</StatusBadge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>Pour les ventes a credit (ardoise).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nom</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Telephone</Label>
              <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-note">Note</Label>
              <Input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="flex w-full flex-col gap-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{detail?.customer.name ?? "Client"}</SheetTitle>
            <SheetDescription>
              {detail?.customer.phone || "Pas de telephone"}
              {detail?.customer.note ? ` · ${detail.customer.note}` : ""}
            </SheetDescription>
          </SheetHeader>

          {detail && (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Solde
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      detail.balance > 0 && "text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {formatFcfa(detail.balance)}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setPayAmount(detail.balance > 0 ? String(detail.balance) : "");
                    setPayOpen(true);
                  }}
                  disabled={detail.balance <= 0}
                >
                  Rembourser
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Historique
                </p>
                {detail.ledger.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun mouvement.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.ledger.map((e) => (
                      <li
                        key={`${e.kind}-${e.id}`}
                        className="flex items-start justify-between gap-3 border-b border-border pb-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {e.kind === "credit_sale" ? "Credit" : "Remboursement"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(e.at).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" · "}
                            {PAYMENT_METHOD_LABELS[e.paymentMethod] ?? e.paymentMethod}
                            {e.note ? ` · ${e.note}` : ""}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 font-semibold tabular-nums",
                            e.kind === "credit_sale"
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-emerald-700 dark:text-emerald-400"
                          )}
                        >
                          {e.kind === "credit_sale" ? "+" : "−"}
                          {formatFcfa(e.amount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un remboursement</DialogTitle>
            <DialogDescription>
              Solde actuel : {detail ? formatFcfa(detail.balance) : "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amt">Montant (FCFA)</Label>
              <Input
                id="pay-amt"
                type="number"
                min={1}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mode de paiement</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {activePaymentMethods.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPayMethod(value)}
                    className={cn(
                      "h-10 border px-2 text-left text-xs font-medium",
                      payMethod === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    )}
                  >
                    {PAYMENT_METHOD_LABELS[value] ?? value}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-note">Note</Label>
              <Input id="pay-note" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Date du paiement (optionnel)</Label>
              <Input
                id="pay-date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={payDateInput}
                onChange={(e) => setPayDateInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Vide = maintenant.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handlePay} disabled={submitting}>
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
