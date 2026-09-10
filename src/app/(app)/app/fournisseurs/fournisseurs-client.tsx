"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Truck } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa, optionalDateInputToIso } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  type Organization,
  type Product,
  type Supplier,
  type SupplierDelivery,
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
import { SearchableSelect } from "@/components/searchable-select";
import { PageHeader } from "@/components/page-header";
import { KpiCell, StatusBadge } from "@/components/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DeliveryLineDraft = {
  productId: string;
  quantity: string;
  unitCost: string;
};

const REPAY_METHODS = [
  "especes",
  "orange_money",
  "mtn_momo",
  "wave",
  "carte_virement",
] as const;

function emptyLine(): DeliveryLineDraft {
  return { productId: "", quantity: "1", unitCost: "" };
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FournisseursPageClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [deliveries, setDeliveries] = useState<SupplierDelivery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<DeliveryLineDraft[]>([emptyLine()]);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("especes");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [activePaymentMethods, setActivePaymentMethods] = useState<string[]>([
    ...REPAY_METHODS,
  ]);

  async function load() {
    setLoading(true);
    try {
      const [supRes, delRes, prodRes] = await Promise.all([
        apiFetch<{ suppliers: Supplier[] }>("/api/v1/suppliers"),
        apiFetch<{ deliveries: SupplierDelivery[] }>("/api/v1/supplier-deliveries?limit=40"),
        apiFetch<{ products: Product[] }>("/api/v1/products"),
      ]);
      setSuppliers(supRes.suppliers);
      setDeliveries(delRes.deliveries);
      setProducts(prodRes.products.filter((p) => p.isActive !== 0));
      if (supRes.suppliers[0] && !supplierId) setSupplierId(supRes.suppliers[0].id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur fournisseurs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- charge fournisseurs au montage
    load();
    apiFetch<{ organization: Organization }>("/api/v1/organization").then((d) => {
      const methods = d.organization.activePaymentMethods.filter((m) =>
        (REPAY_METHODS as readonly string[]).includes(m)
      );
      if (methods.length) {
        setActivePaymentMethods(methods);
        setPaymentMethod(methods[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q) ||
        (s.note ?? "").toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const lineTotal = lines.reduce((sum, l) => {
    const qty = Number(l.quantity) || 0;
    const cost = Number(l.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  async function handleCreateSupplier() {
    if (!name.trim()) {
      toast.error("Nom requis");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          note: note.trim() || null,
        }),
      });
      toast.success("Fournisseur cree");
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

  async function handleCreateDelivery() {
    if (!supplierId) {
      toast.error("Choisissez un fournisseur");
      return;
    }
    const parsed = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: l.productId,
        quantity: Math.floor(Number(l.quantity) || 0),
        unitCost: Number(l.unitCost) || 0,
      }))
      .filter((l) => l.quantity > 0);

    if (parsed.length === 0) {
      toast.error("Ajoutez au moins une ligne");
      return;
    }

    setSubmitting(true);
    try {
      const dateIso = optionalDateInputToIso(deliveryDate);
      const paid = paidAmount.trim() === "" ? lineTotal : Number(paidAmount) || 0;
      await apiFetch("/api/v1/supplier-deliveries", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          lines: parsed,
          paidAmount: paid,
          paymentMethod: paid > 0 ? paymentMethod : null,
          note: deliveryNote.trim() || null,
          ...(dateIso ? { deliveryDate: dateIso } : {}),
        }),
      });
      toast.success("Livraison enregistree — stock mis a jour");
      setDeliveryOpen(false);
      setLines([emptyLine()]);
      setPaidAmount("");
      setDeliveryNote("");
      setDeliveryDate("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Livraison impossible");
    } finally {
      setSubmitting(false);
    }
  }

  const usedProductIds = new Set(lines.map((l) => l.productId).filter(Boolean));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fournisseurs"
        description="Fiches fournisseurs et livraisons qui alimentent le stock."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Fournisseur
            </Button>
            <Button
              onClick={() => {
                if (!suppliers.length) {
                  toast.error("Creez d'abord un fournisseur");
                  return;
                }
                setDeliveryOpen(true);
              }}
            >
              <Truck className="size-4" />
              Nouvelle livraison
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCell label="Fournisseurs" value={String(suppliers.length)} />
        <KpiCell label="Livraisons" value={String(deliveries.length)} />
        <KpiCell
          label="Derniere"
          value={
            deliveries[0]
              ? formatWhen(deliveries[0].deliveryDate)
              : "—"
          }
        />
      </div>

      <Tabs defaultValue="livraisons">
        <TabsList>
          <TabsTrigger value="livraisons">Livraisons</TabsTrigger>
          <TabsTrigger value="fournisseurs">Fournisseurs</TabsTrigger>
        </TabsList>

        <TabsContent value="livraisons" className="space-y-3 pt-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : deliveries.length === 0 ? (
            <section className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
              <Truck className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="font-medium">Aucune livraison</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enregistrez une livraison pour entrer du stock automatiquement.
              </p>
            </section>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-[10px] tracking-wider text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Fournisseur</th>
                    <th className="px-3 py-2 font-semibold text-right">Total</th>
                    <th className="px-3 py-2 font-semibold text-right">Paye</th>
                    <th className="px-3 py-2 font-semibold">Paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5">{formatWhen(d.deliveryDate)}</td>
                      <td className="px-3 py-2.5 font-medium">
                        {d.supplierName ?? "—"}
                        {d.note ? (
                          <span className="block text-xs text-muted-foreground">{d.note}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatFcfa(Number(d.totalAmount))}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatFcfa(Number(d.paidAmount))}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {d.paymentMethod
                          ? (PAYMENT_METHOD_LABELS[d.paymentMethod] ?? d.paymentMethod)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fournisseurs" className="space-y-3 pt-3">
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
          ) : filteredSuppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun fournisseur.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-[10px] tracking-wider text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nom</th>
                    <th className="px-3 py-2 font-semibold">Telephone</th>
                    <th className="px-3 py-2 font-semibold">Note</th>
                    <th className="px-3 py-2 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5 font-medium">{s.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.phone || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{s.note || "—"}</td>
                      <td className="px-3 py-2.5">
                        {s.isActive ? (
                          <StatusBadge tone="good">Actif</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">Inactif</StatusBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau fournisseur</DialogTitle>
            <DialogDescription>Ex. depot boissons, marche, grossiste.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Nom</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">Telephone</Label>
              <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-note">Note</Label>
              <Input id="s-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateSupplier} disabled={submitting}>
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deliveryOpen} onOpenChange={setDeliveryOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle livraison</DialogTitle>
            <DialogDescription>
              Les quantites entrent automatiquement en stock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Fournisseur</Label>
              <SearchableSelect
                value={supplierId}
                onValueChange={setSupplierId}
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Choisir…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-date">Date (optionnel)</Label>
              <Input
                id="d-date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Vide = maintenant.</p>
            </div>

            <div className="space-y-2">
              <Label>Articles</Label>
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1fr_72px_88px_auto] items-end gap-2">
                  <SearchableSelect
                    value={line.productId}
                    onValueChange={(v) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, productId: v } : l))
                      )
                    }
                    options={products
                      .filter((p) => p.id === line.productId || !usedProductIds.has(p.id))
                      .map((p) => ({
                        value: p.id,
                        label: p.name,
                        description: `Stock ${p.currentStock}`,
                      }))}
                    placeholder="Article…"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, quantity: e.target.value } : l
                        )
                      )
                    }
                    placeholder="Qte"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={line.unitCost}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, unitCost: e.target.value } : l
                        )
                      )
                    }
                    placeholder="Cout"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setLines((prev) =>
                        prev.length === 1 ? [emptyLine()] : prev.filter((_, i) => i !== index)
                      )
                    }
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                Ajouter une ligne
              </Button>
              <p className="text-sm font-semibold tabular-nums">
                Total : {formatFcfa(lineTotal)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paid">Montant paye (FCFA)</Label>
              <Input
                id="paid"
                type="number"
                min={0}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={String(lineTotal || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Vide = total entierement paye.
              </p>
            </div>

            {(Number(paidAmount) || lineTotal) > 0 && (
              <div className="space-y-1.5">
                <Label>Mode de paiement</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {activePaymentMethods.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaymentMethod(value)}
                      className={cn(
                        "h-10 border px-2 text-left text-xs font-medium",
                        paymentMethod === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background"
                      )}
                    >
                      {PAYMENT_METHOD_LABELS[value] ?? value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="d-note">Note</Label>
              <Input
                id="d-note"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeliveryOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateDelivery} disabled={submitting}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
