"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { SearchableSelect } from "@/components/searchable-select";

type MovementType = "entry" | "adjustment";
type MovementLine = { productId: string; quantity: number; unit: "unit" | "package" };

function emptyLine(): MovementLine {
  return { productId: "", quantity: 1, unit: "unit" };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function unitsForLine(product: Product, line: MovementLine) {
  if (line.unit === "package" && product.unitsPerPackage) {
    return line.quantity * product.unitsPerPackage;
  }
  return line.quantity;
}

/** Montant ligne : toujours au prix d'achat (coût réel du stock). */
function lineAmount(product: Product, units: number) {
  const unitAmount = Number(product.purchasePrice ?? 0);
  if (!unitAmount || units <= 0) return null;
  return unitAmount * units;
}

function unitPriceLabel(product: Product) {
  const amount = Number(product.purchasePrice ?? 0);
  if (!amount) return null;
  return `${formatFcfa(amount)} / ${product.unitLabel}`;
}

function resolveType(raw: string | null): MovementType {
  return raw === "adjustment" || raw === "sortie" ? "adjustment" : "entry";
}

export default function NouveauMouvementPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Chargement…</div>}>
      <NouveauMouvementForm />
    </Suspense>
  );
}

function NouveauMouvementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const movementType = resolveType(searchParams.get("type"));
  const isEntry = movementType === "entry";

  const [products, setProducts] = useState<Product[]>([]);
  const [movementDate, setMovementDate] = useState(todayIso());
  const [movementNote, setMovementNote] = useState("");
  const [lines, setLines] = useState<MovementLine[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [recapExpanded, setRecapExpanded] = useState(false);

  useEffect(() => {
    apiFetch<{ products: Product[] }>("/api/v1/products").then((d) => setProducts(d.products));
  }, []);

  function updateLine(index: number, patch: Partial<MovementLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length === 1 ? [emptyLine()] : prev.filter((_, i) => i !== index)));
  }

  const usedProductIds = new Set(lines.map((l) => l.productId).filter(Boolean));

  const recapLines = useMemo(() => {
    return lines
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        if (!product || line.quantity <= 0) return null;
        const units = unitsForLine(product, line);
        const delta = isEntry ? units : -units;
        const stockAfter = product.currentStock + delta;
        const amount = lineAmount(product, units);
        return {
          product,
          line,
          units,
          delta,
          stockAfter,
          amount,
          unitPriceHint: unitPriceLabel(product),
          unitLabel:
            line.unit === "package" && product.packageLabel
              ? `${line.quantity} ${product.packageLabel}(s) · ${units} ${product.unitLabel}(s)`
              : `${units} ${product.unitLabel}(s)`,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [lines, products, isEntry]);

  const totalUnits = recapLines.reduce((sum, l) => sum + l.units, 0);
  const totalAmount = recapLines.reduce((sum, l) => sum + (l.amount ?? 0), 0);
  const hasAmounts = recapLines.some((l) => l.amount !== null);

  async function handleSubmit() {
    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      toast.error("Ajoutez au moins un article");
      return;
    }
    if (!isEntry && !movementNote.trim()) {
      toast.error("Le motif est requis pour une sortie de stock");
      return;
    }

    const batchId = crypto.randomUUID();
    setSubmitting(true);
    let succeeded = 0;
    try {
      for (const line of validLines) {
        const product = products.find((p) => p.id === line.productId);
        if (!product) continue;
        const rawQty = unitsForLine(product, line);
        const quantityDelta = isEntry ? rawQty : -rawQty;

        try {
          await apiFetch(`/api/v1/products/${product.id}/stock-movements`, {
            method: "POST",
            body: JSON.stringify({
              type: movementType,
              quantityDelta,
              note: movementNote.trim() || undefined,
              occurredAt: movementDate ? new Date(movementDate).toISOString() : undefined,
              batchId,
            }),
          });
          succeeded++;
        } catch (err) {
          toast.error(`${product.name} : ${err instanceof Error ? err.message : "Erreur"}`);
        }
      }

      if (succeeded === validLines.length) {
        toast.success(`${succeeded} mouvement(s) enregistre(s)`);
        router.push("/app/stock");
      } else if (succeeded > 0) {
        toast.warning(`${succeeded}/${validLines.length} article(s) enregistres — corrigez le reste`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 pb-[calc(11rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
      <PageHeader
        title={isEntry ? "Entree de stock" : "Sortie de stock"}
        description={
          isEntry
            ? "Enregistrez une livraison ou un reapprovisionnement — plusieurs articles possibles."
            : "Constatez une sortie (casse, peremption, inventaire…) — plusieurs articles possibles."
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5 border border-border bg-card p-5 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="movement-date">Date</Label>
              <Input
                id="movement-date"
                type="date"
                value={movementDate}
                max={todayIso()}
                onChange={(e) => setMovementDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="movement-note">
                Motif {!isEntry && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="movement-note"
                value={movementNote}
                onChange={(e) => setMovementNote(e.target.value)}
                placeholder={
                  isEntry ? "Livraison, note (optionnel)" : "Casse, peremption, vol…"
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Articles</Label>
              <span className="font-figures text-xs text-muted-foreground">
                {recapLines.length} ligne{recapLines.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => {
                const product = products.find((p) => p.id === line.productId);
                const hasPackage = !!(product?.packageLabel && product?.unitsPerPackage);
                const units = product && line.quantity > 0 ? unitsForLine(product, line) : 0;
                const amount = product && units > 0 ? lineAmount(product, units) : null;
                return (
                  <div
                    key={index}
                    className="space-y-1.5 border border-border bg-background p-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <SearchableSelect
                        value={line.productId}
                        onValueChange={(v) => updateLine(index, { productId: v, unit: "unit" })}
                        options={products
                          .filter((p) => p.id === line.productId || !usedProductIds.has(p.id))
                          .map((p) => ({
                            value: p.id,
                            label: p.name,
                            description: `Stock ${p.currentStock} ${p.unitLabel}(s)`,
                          }))}
                        placeholder="Choisir un article"
                        searchPlaceholder="Rechercher un article…"
                        emptyText="Aucun article trouve"
                        className="order-1 min-w-0 flex-1 basis-40"
                      />

                      <Input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                        className="order-2 w-20 shrink-0"
                        aria-label="Quantite"
                      />

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeLine(index)}
                        disabled={lines.length === 1 && !line.productId}
                        aria-label="Retirer la ligne"
                        className="order-3 shrink-0 sm:order-4"
                      >
                        <Trash2 className="size-4" />
                      </Button>

                      {hasPackage && (
                        <Select
                          value={line.unit}
                          onValueChange={(v) => updateLine(index, { unit: v as "unit" | "package" })}
                        >
                          <SelectTrigger className="order-4 w-full sm:order-3 sm:w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unit">{product?.unitLabel}(s)</SelectItem>
                            <SelectItem value="package">{product?.packageLabel}(s)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {product && units > 0 && (
                      <p className="font-figures px-0.5 text-[11px] text-muted-foreground sm:col-span-full">
                        {amount !== null ? (
                          <>
                            {units} × {unitPriceLabel(product)} ={" "}
                            <span className="font-semibold text-foreground">{formatFcfa(amount)}</span>
                          </>
                        ) : (
                          <>
                            Stock actuel : {product.currentStock} {product.unitLabel}(s)
                            {" · prix achat non renseigne dans Articles"}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={addLine}>
              <Plus className="size-3.5" /> Ajouter un article
            </Button>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => router.push("/app/stock")}>
              Annuler
            </Button>
          </div>
        </div>

        <aside
          className={cn(
            "flex w-full max-w-none shrink-0 flex-col border border-border bg-card",
            "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-20 max-lg:border-x-0 max-lg:border-b-0 max-lg:pb-safe max-lg:shadow-[0_-8px_30px_rgba(0,0,0,0.08)]",
            recapExpanded && "max-lg:max-h-[min(70dvh,34rem)]",
            "lg:sticky lg:top-20"
          )}
        >
          <button
            type="button"
            onClick={() => setRecapExpanded((v) => !v)}
            className={cn(
              "flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 text-left lg:pointer-events-none",
              isEntry ? "bg-success/5" : "bg-destructive/5"
            )}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Recapitulatif
              </p>
              <div className="mt-1 flex items-center gap-2">
                {isEntry ? (
                  <ArrowDownLeft className="size-4 text-success" />
                ) : (
                  <ArrowUpRight className="size-4 text-destructive" />
                )}
                <p
                  className={cn(
                    "text-base font-bold tracking-tight",
                    isEntry ? "text-success" : "text-destructive"
                  )}
                >
                  {isEntry ? "Entree de stock" : "Sortie de stock"}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {recapLines.length === 0
                  ? "Vide — ajoutez un article"
                  : `${totalUnits} unité${totalUnits > 1 ? "s" : ""} · ${recapLines.length} ligne${recapLines.length > 1 ? "s" : ""}`}
              </p>
            </div>
            {recapExpanded ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground lg:hidden" />
            ) : (
              <ChevronUp className="size-4 shrink-0 text-muted-foreground lg:hidden" />
            )}
          </button>

          <div
            className={cn(
              "shrink-0 space-y-3 border-b border-border px-4 py-3 text-sm",
              !recapExpanded && "max-lg:hidden"
            )}
          >
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Date</span>
              <span className="font-figures font-medium">
                {new Date(movementDate + "T12:00:00").toLocaleDateString("fr-FR")}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Motif</span>
              <span className="max-w-[55%] truncate text-right font-medium">
                {movementNote.trim() || (isEntry ? "—" : "Requis")}
              </span>
            </div>
          </div>

          <div className={cn("min-h-0 flex-1 overflow-y-auto lg:min-h-[12rem]", !recapExpanded && "max-lg:hidden")}>
            {recapLines.length === 0 ? (
              <div className="flex h-40 items-center justify-center px-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Le recap se remplit au fur et a mesure de la saisie.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-dashed divide-border">
                {recapLines.map((row) => (
                  <li key={row.product.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{row.product.name}</p>
                      <span
                        className={cn(
                          "font-figures shrink-0 text-sm font-bold",
                          isEntry ? "text-success" : "text-destructive"
                        )}
                      >
                        {isEntry ? "+" : "−"}
                        {row.units}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{row.unitLabel}</p>
                    {row.amount !== null && (
                      <p className="font-figures mt-1 text-xs text-muted-foreground">
                        {row.units} × {row.unitPriceHint} ={" "}
                        <span className="font-semibold text-foreground">{formatFcfa(row.amount)}</span>
                      </p>
                    )}
                    <p className="font-figures mt-1.5 text-xs text-muted-foreground">
                      Stock {row.product.currentStock}
                      <span className="mx-1.5 text-border">→</span>
                      <span
                        className={cn(
                          "font-semibold",
                          row.stockAfter < 0 ? "text-destructive" : "text-foreground"
                        )}
                      >
                        {row.stockAfter}
                      </span>
                      {row.stockAfter < 0 && (
                        <span className="ml-1.5 text-destructive">insuffisant</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-border px-4 py-4">
            {hasAmounts && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {isEntry ? "Montant achat" : "Cout sorti"}
                </span>
                <span className="font-figures text-xl font-bold tracking-tight">
                  {formatFcfa(totalAmount)}
                </span>
              </div>
            )}
            <Button
              className="h-11 w-full"
              onClick={handleSubmit}
              disabled={submitting || recapLines.length === 0}
            >
              {submitting
                ? "Enregistrement…"
                : isEntry
                  ? "Enregistrer l'entree"
                  : "Enregistrer la sortie"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
