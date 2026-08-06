"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Product, StockMovementWithProduct } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MOVEMENT_TYPE_LABELS: Record<StockMovementWithProduct["type"], string> = {
  initial: "Stock initial",
  entry: "Entree",
  sale_exit: "Vente",
  adjustment: "Ajustement",
};

type MovementGroup = {
  key: string;
  batchId: string | null;
  type: StockMovementWithProduct["type"];
  note: string | null;
  createdAt: string;
  items: StockMovementWithProduct[];
  isReversal: boolean;
  reversed: boolean;
};

export default function StockMovementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [movements, setMovements] = useState<StockMovementWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmReverse, setConfirmReverse] = useState(false);
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ movements: StockMovementWithProduct[] }>("/api/v1/stock-movements"),
      apiFetch<{ products: Product[] }>("/api/v1/products"),
    ])
      .then(([m, p]) => {
        setMovements(m.movements);
        setProducts(p.products);
      })
      .finally(() => setLoading(false));
  }, []);

  const group = useMemo<MovementGroup | null>(() => {
    if (!id || movements.length === 0) return null;

    const reversedBatchIds = new Set(
      movements.filter((m) => m.reversalOfBatchId).map((m) => m.reversalOfBatchId as string)
    );

    const items = movements.filter((m) => m.batchId === id || m.id === id);
    if (items.length === 0) return null;

    const first = items[0];
    return {
      key: first.batchId ?? first.id,
      batchId: first.batchId,
      type: first.type,
      note: first.note,
      createdAt: first.createdAt,
      items,
      isReversal: !!first.reversalOfBatchId,
      reversed: first.batchId ? reversedBatchIds.has(first.batchId) : false,
    };
  }, [id, movements]);

  async function handleReverse() {
    if (!group?.batchId) return;
    setReversing(true);
    try {
      await apiFetch(`/api/v1/stock-movements/${group.batchId}/reverse`, { method: "POST" });
      toast.success("Mouvement annule");
      router.push("/app/stock?tab=historique");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setReversing(false);
      setConfirmReverse(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto w-full max-w-6xl">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto w-full max-w-6xl space-y-4">
        <PageHeader title="Mouvement introuvable" description="Ce mouvement n'existe pas ou a ete supprime." />
        <Button asChild variant="outline">
          <Link href="/app/stock?tab=historique">Retour a l&apos;historique</Link>
        </Button>
      </div>
    );
  }

  const isEntry = group.type === "entry" || group.type === "initial";
  const canReverse =
    !!group.batchId &&
    !group.reversed &&
    !group.isReversal &&
    (group.type === "entry" || group.type === "adjustment");
  const totalUnits = group.items.reduce((sum, item) => sum + Math.abs(item.quantityDelta), 0);
  const dateLabel = new Date(group.createdAt).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusLabel = group.reversed ? "Annule" : group.isReversal ? "Correction" : "Actif";
  const statusTone = group.reversed ? "neutral" : group.isReversal ? "neutral" : isEntry ? "good" : "bad";

  function unitFor(productId: string) {
    return products.find((p) => p.id === productId)?.unitLabel ?? "piece";
  }

  return (
    <div className="container mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title={isEntry ? "Entree de stock" : group.type === "sale_exit" ? "Sortie vente" : "Sortie de stock"}
        description={dateLabel}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/stock?tab=historique">
              <ArrowLeft className="size-3.5" /> Retour
            </Link>
          </Button>
        }
      />

      <div className="border border-border bg-card">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3",
            isEntry ? "bg-success/5" : "bg-destructive/5"
          )}
        >
          <div className="flex items-center gap-2">
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
              {MOVEMENT_TYPE_LABELS[group.type]}
            </p>
          </div>
          <StatusBadge tone={statusTone as "good" | "bad" | "neutral"}>{statusLabel}</StatusBadge>
        </div>

        <div className="grid gap-px border-b border-border bg-border sm:grid-cols-3">
          <div className="bg-card px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Motif
            </p>
            <p className="mt-1 truncate text-sm font-medium">{group.note?.trim() || "—"}</p>
          </div>
          <div className="bg-card px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Lignes
            </p>
            <p className="font-figures mt-1 text-sm font-bold">{group.items.length}</p>
          </div>
          <div className="bg-card px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Total
            </p>
            <p
              className={cn(
                "font-figures mt-1 text-sm font-bold",
                isEntry ? "text-success" : "text-destructive"
              )}
            >
              {isEntry ? "+" : "−"}
              {totalUnits}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-border bg-muted/80">
              <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-semibold">Article</th>
                <th className="px-4 py-2.5 text-right font-semibold">Quantite</th>
                <th className="px-4 py-2.5 text-right font-semibold">Delta</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item) => {
                const unit = unitFor(item.productId);
                const abs = Math.abs(item.quantityDelta);
                return (
                  <tr key={item.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 font-medium">{item.productName}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      <span className="font-figures">{abs}</span>{" "}
                      <span className="text-[11px]">
                        {unit}
                        {abs !== 1 ? "(s)" : ""}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "font-figures px-4 py-3 text-right text-sm font-bold",
                        item.quantityDelta > 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {item.quantityDelta > 0 ? "+" : ""}
                      {item.quantityDelta}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Total mouvement</p>
            <p
              className={cn(
                "font-figures text-2xl font-bold tracking-tight",
                isEntry ? "text-success" : "text-destructive"
              )}
            >
              {isEntry ? "+" : "−"}
              {totalUnits}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/app/stock?tab=historique">Retour a l&apos;historique</Link>
            </Button>
            {canReverse && (
              <Button
                type="button"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={() => setConfirmReverse(true)}
              >
                Annuler le mouvement
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmReverse} onOpenChange={setConfirmReverse}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce mouvement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le stock des {group.items.length} article(s) concerne(s) sera remis a son niveau
              precedent via une ecriture de correction — le mouvement d&apos;origine reste visible dans
              l&apos;historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleReverse} disabled={reversing}>
              {reversing ? "Annulation…" : "Annuler le mouvement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
