"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Receipt, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { DEFAULT_PERIOD_SELECTION, resolvePeriodSelection } from "@/lib/dashboard-math";
import {
  PAYMENT_METHOD_LABELS,
  type Organization,
  type PeriodKey,
  type PeriodSelection,
  type Product,
  type Sale,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/searchable-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  KpiCell,
  PAGE_SIZES,
  paginate,
  TablePagination,
} from "@/components/data-table";
import { PeriodSelector } from "@/components/dashboard/period-selector";

const ALL_PAYMENTS = "all";

type CartLine = { productId: string; quantity: number; discount: number };

type SaleGroup = {
  key: string;
  batchId: string | null;
  soldAt: string;
  paymentMethod: string;
  items: Sale[];
  total: number;
  lineCount: number;
  unitCount: number;
};

function emptyLine(): CartLine {
  return { productId: "", quantity: 1, discount: 0 };
}

function periodKpiLabels(period: PeriodKey) {
  switch (period) {
    case "today":
      return { revenue: "CA du jour", invoices: "Factures", avg: "Ticket moyen", units: "Articles vendus" };
    case "week":
      return { revenue: "CA semaine", invoices: "Factures", avg: "Ticket moyen", units: "Articles vendus" };
    case "year":
      return { revenue: "CA annee", invoices: "Factures", avg: "Ticket moyen", units: "Articles vendus" };
    case "custom":
      return { revenue: "CA periode", invoices: "Factures", avg: "Ticket moyen", units: "Articles vendus" };
    case "month":
    default:
      return { revenue: "CA du mois", invoices: "Factures", avg: "Ticket moyen", units: "Articles vendus" };
  }
}

function groupSalesByTicket(sales: Sale[]): SaleGroup[] {
  const groups = new Map<string, SaleGroup>();
  const order: string[] = [];

  for (const sale of sales) {
    const key = sale.batchId ?? sale.id;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        batchId: sale.batchId,
        soldAt: sale.soldAt,
        paymentMethod: sale.paymentMethod,
        items: [],
        total: 0,
        lineCount: 0,
        unitCount: 0,
      });
      order.push(key);
    }
    const group = groups.get(key)!;
    group.items.push(sale);
    group.total += Number(sale.netAmount);
    group.lineCount += 1;
    group.unitCount += sale.quantity;
  }

  return order
    .map((k) => groups.get(k)!)
    .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
}

function formatSaleTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatQtyByUnit(lines: { quantity: number; unitLabel: string }[]) {
  const byUnit = new Map<string, number>();
  for (const line of lines) {
    const label = line.unitLabel.trim() || "piece";
    byUnit.set(label, (byUnit.get(label) ?? 0) + line.quantity);
  }
  return [...byUnit.entries()]
    .map(([label, qty]) => `${qty} ${label}${qty > 1 ? "(s)" : ""}`)
    .join(" · ");
}

function groupQtyLabel(group: SaleGroup, products: Product[]) {
  return formatQtyByUnit(
    group.items.map((s) => ({
      quantity: s.quantity,
      unitLabel: products.find((p) => p.id === s.productId)?.unitLabel ?? "piece",
    }))
  );
}

function groupContentLabel(group: SaleGroup, products: Product[]) {
  if (group.lineCount === 1) {
    return products.find((p) => p.id === group.items[0]?.productId)?.name ?? "—";
  }
  const names = group.items
    .map((s) => products.find((p) => p.id === s.productId)?.name)
    .filter(Boolean)
    .slice(0, 2);
  const extra = group.lineCount - names.length;
  return extra > 0 ? `${names.join(", ")} +${extra}` : names.join(", ");
}

export default function VentesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activePaymentMethods, setActivePaymentMethods] = useState<string[]>(
    Object.keys(PAYMENT_METHOD_LABELS)
  );
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SaleGroup | null>(null);
  const [mainTab, setMainTab] = useState("caisse");
  const [historyPeriod, setHistoryPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD_SELECTION);

  const [historySearch, setHistorySearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState(ALL_PAYMENTS);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [cart, setCart] = useState<CartLine[]>([emptyLine()]);
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [recapExpanded, setRecapExpanded] = useState(false);

  function loadProducts() {
    apiFetch<{ products: Product[] }>("/api/v1/products")
      .then((d) => setProducts(d.products))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Erreur produits"));
  }

  function loadSales(selection: PeriodSelection) {
    const { from, to } = resolvePeriodSelection(selection);
    const qs = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });
    apiFetch<{ sales: Sale[] }>(`/api/v1/sales?${qs}`)
      .then((d) => setSales(d.sales))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Erreur ventes"));
  }

  function loadAll() {
    loadProducts();
    loadSales(historyPeriod);
  }

  useEffect(() => {
    loadProducts();
    apiFetch<{ organization: Organization }>("/api/v1/organization").then((d) => {
      setActivePaymentMethods(d.organization.activePaymentMethods);
      setPaymentMethod((prev) =>
        d.organization.activePaymentMethods.includes(prev)
          ? prev
          : d.organization.activePaymentMethods[0]
      );
    });
  }, []);

  useEffect(() => {
    loadSales(historyPeriod);
  }, [historyPeriod.preset, historyPeriod.customFrom, historyPeriod.customTo]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, paymentFilter, historyPageSize]);

  function updateLine(index: number, patch: Partial<CartLine>) {
    setCart((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const next = { ...l, ...patch };
        if (patch.productId !== undefined || patch.quantity !== undefined) {
          const product = products.find((p) => p.id === next.productId);
          if (product) {
            next.quantity = Math.min(Math.max(1, next.quantity), Math.max(1, product.currentStock));
          }
        }
        return next;
      })
    );
  }

  function addLine() {
    setCart((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setCart((prev) => (prev.length === 1 ? [emptyLine()] : prev.filter((_, i) => i !== index)));
  }

  const usedProductIds = new Set(cart.map((l) => l.productId).filter(Boolean));

  const cartLines = useMemo(
    () =>
      cart
        .map((line, index) => {
          const product = products.find((p) => p.id === line.productId);
          if (!product || line.quantity <= 0) return null;
          const unitPrice = Number(product.unitPrice);
          const subtotal = unitPrice * line.quantity;
          const lineTotal = Math.max(0, subtotal - line.discount);
          return { ...line, index, product, unitPrice, subtotal, lineTotal };
        })
        .filter((l): l is NonNullable<typeof l> => l !== null),
    [cart, products]
  );

  const grandTotal = cartLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const cartUnitsLabel = formatQtyByUnit(
    cartLines.map((l) => ({ quantity: l.quantity, unitLabel: l.product.unitLabel }))
  );

  const saleGroups = useMemo(() => groupSalesByTicket(sales), [sales]);

  const todayStats = useMemo(() => {
    const revenue = saleGroups.reduce((sum, g) => sum + g.total, 0);
    const invoices = saleGroups.length;
    const units = saleGroups.reduce((sum, g) => sum + g.unitCount, 0);
    const avgTicket = invoices > 0 ? revenue / invoices : 0;
    const byPayment = new Map<string, { count: number; amount: number }>();
    for (const g of saleGroups) {
      const cur = byPayment.get(g.paymentMethod) ?? { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += g.total;
      byPayment.set(g.paymentMethod, cur);
    }
    return { revenue, invoices, units, avgTicket, byPayment };
  }, [saleGroups]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return saleGroups.filter((g) => {
      const matchesPayment = paymentFilter === ALL_PAYMENTS || g.paymentMethod === paymentFilter;
      if (!matchesPayment) return false;
      if (!q) return true;
      const content = groupContentLabel(g, products).toLowerCase();
      const payment = (PAYMENT_METHOD_LABELS[g.paymentMethod] ?? g.paymentMethod).toLowerCase();
      return content.includes(q) || payment.includes(q) || formatSaleTime(g.soldAt).includes(q);
    });
  }, [saleGroups, paymentFilter, historySearch, products]);

  const historyPager = useMemo(
    () => paginate(filteredHistory, historyPage, historyPageSize),
    [filteredHistory, historyPage, historyPageSize]
  );

  const paymentTabs = useMemo(() => {
    const used = [...todayStats.byPayment.keys()];
    return used.sort((a, b) => a.localeCompare(b, "fr"));
  }, [todayStats.byPayment]);

  const historyKpis = periodKpiLabels(historyPeriod.preset);

  async function handleSubmit() {
    if (cartLines.length === 0) {
      toast.error("Ajoutez au moins un article");
      return;
    }

    const batchId = crypto.randomUUID();
    setSubmitting(true);
    const failedLines: CartLine[] = [];
    try {
      for (const line of cartLines) {
        try {
          await apiFetch("/api/v1/sales", {
            method: "POST",
            body: JSON.stringify({
              productId: line.product.id,
              quantity: line.quantity,
              discount: line.discount,
              paymentMethod,
              batchId,
            }),
          });
        } catch {
          failedLines.push({
            productId: line.product.id,
            quantity: line.quantity,
            discount: line.discount,
          });
        }
      }

      const succeeded = cartLines.length - failedLines.length;
      if (failedLines.length === 0) {
        toast.success(`Facture enregistree — ${formatFcfa(grandTotal)}`);
        setCart([emptyLine()]);
      } else if (succeeded > 0) {
        toast.warning(
          `${succeeded}/${cartLines.length} article(s) enregistres, ${failedLines.length} en erreur`
        );
        setCart(failedLines.length > 0 ? failedLines : [emptyLine()]);
      } else {
        toast.error("Echec de l'enregistrement — verifiez la connexion et reessayez");
      }
      loadAll();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] bottom-0 z-10 flex bg-background md:inset-y-0 md:top-[calc(4rem+env(safe-area-inset-top,0px))] md:left-60">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border bg-card px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Caisse
              </p>
              <h1 className="text-xl font-bold tracking-tight">Ventes</h1>
            </div>
          </div>
        </div>

        <Tabs
          value={mainTab}
          onValueChange={setMainTab}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="shrink-0 border-b border-border bg-card px-4 pt-2 md:px-5">
            <TabsList variant="line" className="h-10 w-full justify-start gap-0 rounded-none p-0">
              <TabsTrigger value="caisse" className="gap-1.5 rounded-none px-4">
                <ShoppingCart className="size-3.5" />
                Caisse
              </TabsTrigger>
              <TabsTrigger value="historique" className="gap-1.5 rounded-none px-4">
                <Receipt className="size-3.5" />
                Historique
                {todayStats.invoices > 0 && (
                  <span className="font-figures ml-1 text-[10px] text-muted-foreground">
                    {todayStats.invoices}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="caisse"
            className="mt-0 flex min-h-0 flex-1 flex-col outline-none lg:flex-row"
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto scroll-touch px-4 py-4 pb-[calc(11rem+env(safe-area-inset-bottom,0px))] md:px-5 lg:pb-4">
              <div className="space-y-3 border border-border bg-card p-4 md:p-5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Articles</Label>
                  <span className="font-figures text-xs text-muted-foreground">
                    {cartLines.length} ligne{cartLines.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {cart.map((line, index) => {
                    const product = products.find((p) => p.id === line.productId);
                    const unitPrice = product ? Number(product.unitPrice) : 0;
                    const subtotal = product && line.quantity > 0 ? unitPrice * line.quantity : 0;
                    const lineTotal = Math.max(0, subtotal - line.discount);
                    const productOptions = products
                      .filter((p) => p.id === line.productId || !usedProductIds.has(p.id))
                      .map((p) => ({
                        value: p.id,
                        label: p.name,
                        description:
                          p.currentStock <= 0
                            ? "Rupture de stock"
                            : `Stock ${p.currentStock} · ${formatFcfa(Number(p.unitPrice))}`,
                        disabled: p.currentStock <= 0 && p.id !== line.productId,
                      }));
                    return (
                      <div
                        key={index}
                        className="space-y-1.5 border border-border bg-background p-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <SearchableSelect
                            value={line.productId}
                            onValueChange={(v) => updateLine(index, { productId: v })}
                            options={productOptions}
                            placeholder="Choisir un article"
                            searchPlaceholder="Rechercher un article…"
                            emptyText="Aucun article trouve"
                            className="order-1 min-w-0 flex-1 basis-40"
                          />

                          <Input
                            type="number"
                            min={1}
                            max={product?.currentStock ?? undefined}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(index, { quantity: Number(e.target.value) || 1 })
                            }
                            className="order-2 w-20 shrink-0"
                            aria-label="Quantite"
                          />

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeLine(index)}
                            disabled={cart.length === 1 && !line.productId}
                            aria-label="Retirer la ligne"
                            className="order-3 shrink-0"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>

                        {product && (
                          <div className="flex flex-wrap items-center gap-2 px-0.5">
                            <Input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={line.discount || ""}
                              onChange={(e) =>
                                updateLine(index, {
                                  discount: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              placeholder="Remise (FCFA)"
                              className="font-figures h-8 max-w-[10rem] text-xs"
                            />
                            <p className="font-figures text-[11px] text-muted-foreground">
                              {line.quantity} {product.unitLabel}
                              {line.quantity > 1 ? "(s)" : ""} × {formatFcfa(unitPrice)}
                              {line.discount > 0 && (
                                <span className="text-destructive"> − {formatFcfa(line.discount)}</span>
                              )}
                              {" = "}
                              <span className="font-semibold text-foreground">
                                {formatFcfa(lineTotal)}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={addLine}>
                  <Plus className="size-3.5" /> Ajouter un article
                </Button>
              </div>
            </div>

            <aside
              className={cn(
                "flex w-full shrink-0 flex-col border border-border bg-card lg:w-[22rem] lg:border-y-0 lg:border-r-0 xl:w-[24rem]",
                "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-20 max-lg:border-x-0 max-lg:border-b-0 max-lg:pb-safe max-lg:shadow-[0_-8px_30px_rgba(0,0,0,0.08)]",
                recapExpanded && "max-lg:max-h-[min(70dvh,34rem)]",
                "lg:sticky lg:top-0 lg:h-full lg:border-l"
              )}
            >
              <button
                type="button"
                onClick={() => setRecapExpanded((v) => !v)}
                className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-primary/5 px-4 py-3 text-left lg:pointer-events-none"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Ticket
                  </p>
                  <p className="mt-0.5 text-sm font-bold tracking-tight">
                    {cartLines.length === 0
                      ? "Vide — ajoutez un article"
                      : `${cartUnitsLabel} · ${cartLines.length} ligne${cartLines.length > 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 lg:hidden">
                  <span className="font-figures text-lg font-bold tracking-tight">
                    {cartLines.length > 0 ? formatFcfa(grandTotal) : "—"}
                  </span>
                  {recapExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              <div
                className={cn(
                  "min-h-0 flex-1 flex-col overflow-hidden",
                  recapExpanded ? "flex" : "hidden lg:flex"
                )}
              >
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {cartLines.length === 0 ? (
                    <div className="flex h-full min-h-[6rem] items-center justify-center px-6 text-center">
                      <p className="text-sm text-muted-foreground">Le ticket apparait ici.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-dashed divide-border">
                      {cartLines.map((line) => (
                        <li key={line.productId} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold leading-snug">
                                {line.product.name}
                              </p>
                              <p className="font-figures mt-0.5 text-[11px] text-muted-foreground">
                                {formatFcfa(line.unitPrice)} × {line.quantity} {line.product.unitLabel}
                                {line.quantity > 1 ? "(s)" : ""}
                                {line.discount > 0 && (
                                  <span className="text-destructive">
                                    {" "}
                                    − {formatFcfa(line.discount)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <p className="font-figures shrink-0 text-sm font-bold tabular-nums">
                              {formatFcfa(line.lineTotal)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="shrink-0 border-t border-border bg-card">
                  {cartLines.length > 0 && (
                    <div className="space-y-2 border-b border-border px-4 py-3">
                      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        Paiement
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {activePaymentMethods.map((value) => {
                          const active = paymentMethod === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setPaymentMethod(value)}
                              className={cn(
                                "h-11 border px-2 text-left text-[11px] font-medium leading-tight transition-colors",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              )}
                            >
                              {PAYMENT_METHOD_LABELS[value] ?? value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 px-4 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-muted-foreground">Total</span>
                      <span className="font-figures text-2xl font-bold tracking-tight">
                        {cartLines.length > 0 ? formatFcfa(grandTotal) : "—"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {cartLines.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => setCart([emptyLine()])}
                        >
                          Vider
                        </Button>
                      )}
                      <Button
                        className="h-12 flex-1 text-base font-semibold"
                        onClick={handleSubmit}
                        disabled={cartLines.length === 0 || submitting}
                      >
                        {submitting ? "Enregistrement…" : "Encaisser"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </TabsContent>

          <TabsContent value="historique" className="mt-0 flex min-h-0 flex-1 flex-col outline-none">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scroll-touch px-4 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Historique des factures sur la periode selectionnee.
                </p>
                <PeriodSelector value={historyPeriod} onChange={setHistoryPeriod} />
              </div>

              <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
                <KpiCell label={historyKpis.revenue} value={formatFcfa(todayStats.revenue)} tone="good" />
                <KpiCell label={historyKpis.invoices} value={String(todayStats.invoices)} />
                <KpiCell label={historyKpis.avg} value={formatFcfa(todayStats.avgTicket)} />
                <KpiCell label={historyKpis.units} value={String(todayStats.units)} />
              </div>

              {paymentTabs.length > 0 && (
                <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
                  {paymentTabs.map((method) => {
                    const data = todayStats.byPayment.get(method)!;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() =>
                          setPaymentFilter((prev) => (prev === method ? ALL_PAYMENTS : method))
                        }
                        className={cn(
                          "bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                          paymentFilter === method && "bg-primary/5 ring-1 ring-inset ring-primary"
                        )}
                      >
                        <p className="truncate text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                          {PAYMENT_METHOD_LABELS[method] ?? method}
                        </p>
                        <p className="font-figures mt-0.5 text-sm font-bold">
                          {formatFcfa(data.amount)}
                        </p>
                        <p className="font-figures text-[11px] text-muted-foreground">
                          {data.count} facture{data.count > 1 ? "s" : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="border border-border bg-card">
                <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                  <div className="relative min-w-0 flex-1 basis-48">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Rechercher une facture…"
                      className="h-9 pl-9"
                    />
                  </div>
                  {paymentFilter !== ALL_PAYMENTS && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPaymentFilter(ALL_PAYMENTS)}
                    >
                      Tous paiements
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <thead className="border-b border-border bg-muted/80">
                      <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                        <th className="px-4 py-2.5 font-semibold">Heure</th>
                        <th className="px-4 py-2.5 font-semibold">Facture</th>
                        <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Paiement</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Quantite</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyPager.rows.map((group) => (
                        <tr
                          key={group.key}
                          onClick={() => setSelectedTicket(group)}
                          className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/40"
                        >
                          <td className="font-figures px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                            {formatSaleTime(group.soldAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="truncate text-sm font-semibold">
                              {groupContentLabel(group, products)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground sm:hidden">
                              {PAYMENT_METHOD_LABELS[group.paymentMethod] ?? group.paymentMethod}
                            </p>
                          </td>
                          <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                            {PAYMENT_METHOD_LABELS[group.paymentMethod] ?? group.paymentMethod}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                            {groupQtyLabel(group, products)}
                          </td>
                          <td className="font-figures px-4 py-2.5 text-right text-sm font-bold">
                            {formatFcfa(group.total)}
                          </td>
                        </tr>
                      ))}
                      {historyPager.total === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                            {saleGroups.length === 0
                              ? "Pas encore de vente sur cette periode."
                              : "Aucune facture ne correspond aux filtres."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  from={historyPager.from}
                  to={historyPager.to}
                  total={historyPager.total}
                  page={historyPager.page}
                  pageCount={historyPager.pageCount}
                  pageSize={historyPageSize}
                  onPageChange={setHistoryPage}
                  onPageSizeChange={(size) => setHistoryPageSize(size)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <Sheet open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          {selectedTicket && (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle className="text-lg font-bold tracking-tight">Detail facture</SheetTitle>
                <SheetDescription asChild>
                  <div className="space-y-1 pt-1 text-sm">
                    <p className="font-figures font-medium text-foreground">
                      {new Date(selectedTicket.soldAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p>
                      {PAYMENT_METHOD_LABELS[selectedTicket.paymentMethod] ??
                        selectedTicket.paymentMethod}
                    </p>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-4 py-2">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      <th className="py-2 font-semibold">Article</th>
                      <th className="py-2 text-right font-semibold">Qte</th>
                      <th className="py-2 text-right font-semibold">P.U.</th>
                      <th className="py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-border">
                    {selectedTicket.items.map((s) => {
                      const product = products.find((p) => p.id === s.productId);
                      const discount = Number(s.discount);
                      const unit = product?.unitLabel ?? "piece";
                      return (
                        <tr key={s.id}>
                          <td className="py-2.5 pr-2">
                            <p className="font-medium">{product?.name ?? "—"}</p>
                            {discount > 0 && (
                              <p className="font-figures mt-0.5 text-[11px] text-destructive">
                                Remise −{formatFcfa(discount)}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 text-right text-muted-foreground">
                            <span className="font-figures">{s.quantity}</span>
                            <span className="ml-1 text-[11px]">
                              {unit}
                              {s.quantity > 1 ? "(s)" : ""}
                            </span>
                          </td>
                          <td className="font-figures py-2.5 text-right text-muted-foreground">
                            {formatFcfa(Number(s.unitPrice))}
                          </td>
                          <td className="font-figures py-2.5 text-right font-semibold">
                            {formatFcfa(Number(s.netAmount))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-auto border-t border-border px-4 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedTicket.lineCount} ligne{selectedTicket.lineCount > 1 ? "s" : ""} ·{" "}
                    {groupQtyLabel(selectedTicket, products)}
                  </span>
                  <span className="font-figures text-xl font-bold tracking-tight">
                    {formatFcfa(selectedTicket.total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
