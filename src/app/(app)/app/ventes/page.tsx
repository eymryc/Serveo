"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus, Receipt, RefreshCw, Search, ShoppingCart, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type Category, type Organization, type Product, type Sale } from "@/lib/types";
import { enqueueSale, getQueue, syncQueue, type QueuedSale } from "@/lib/offline-sales-queue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const ALL_CATEGORIES = "all";
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

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activePaymentMethods, setActivePaymentMethods] = useState<string[]>(
    Object.keys(PAYMENT_METHOD_LABELS)
  );
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SaleGroup | null>(null);
  const [mainTab, setMainTab] = useState("caisse");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [historySearch, setHistorySearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState(ALL_PAYMENTS);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("especes");

  function loadAll() {
    apiFetch<{ products: Product[] }>("/api/v1/products")
      .then((d) => setProducts(d.products))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Erreur produits"));
    apiFetch<{ sales: Sale[] }>(`/api/v1/sales?from=${encodeURIComponent(startOfTodayIso())}`)
      .then((d) => setSales(d.sales))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Erreur ventes"));
  }

  const runSync = useCallback(async () => {
    if (getQueue().length === 0) return;
    setSyncing(true);
    try {
      const { synced } = await syncQueue();
      setQueue(getQueue());
      if (synced > 0) toast.success(`${synced} vente(s) synchronisee(s)`);
      loadAll();
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setQueue(getQueue());
    loadAll();
    apiFetch<{ categories: Category[] }>("/api/v1/categories").then((d) => setCategories(d.categories));
    apiFetch<{ organization: Organization }>("/api/v1/organization").then((d) => {
      setActivePaymentMethods(d.organization.activePaymentMethods);
      setPaymentMethod((prev) =>
        d.organization.activePaymentMethods.includes(prev) ? prev : d.organization.activePaymentMethods[0]
      );
    });

    const handleOnline = () => {
      setIsOnline(true);
      runSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const interval = setInterval(() => {
      if (navigator.onLine) runSync();
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [runSync]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, paymentFilter, historyPageSize]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES ? true : p.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const usedCategoryIds = useMemo(
    () => new Set(products.map((p) => p.categoryId).filter((id): id is string => !!id)),
    [products]
  );
  const visibleCategories = categories.filter((c) => usedCategoryIds.has(c.id));

  const cartQtyByProduct = useMemo(
    () => new Map(cart.map((l) => [l.productId, l.quantity])),
    [cart]
  );

  const cartLines = useMemo(
    () =>
      cart
        .map((line) => {
          const product = products.find((p) => p.id === line.productId);
          if (!product) return null;
          const unitPrice = Number(product.unitPrice);
          const subtotal = unitPrice * line.quantity;
          const lineTotal = Math.max(0, subtotal - line.discount);
          return { ...line, product, unitPrice, subtotal, lineTotal };
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

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: Math.min(product.currentStock, l.quantity + 1) }
            : l
        );
      }
      return [...prev, { productId: product.id, quantity: 1, discount: 0 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const product = products.find((p) => p.id === productId);
          const maxQty = product?.currentStock ?? l.quantity;
          const nextQty = Math.min(maxQty, l.quantity + delta);
          return { ...l, quantity: nextQty };
        })
        .filter((l) => l.quantity > 0)
    );
  }

  function updateDiscount(productId: string, discount: number) {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, discount: Math.max(0, discount) } : l))
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function handleSubmit() {
    if (cartLines.length === 0) return;

    const batchId = crypto.randomUUID();

    if (!navigator.onLine) {
      for (const line of cartLines) {
        enqueueSale({
          productId: line.product.id,
          productName: line.product.name,
          quantity: line.quantity,
          discount: line.discount,
          paymentMethod,
          batchId,
        });
      }
      setQueue(getQueue());
      toast.warning(`Hors-ligne — ${cartLines.length} article(s) mis en attente`);
      setCart([]);
      return;
    }

    setSubmitting(true);
    let succeeded = 0;
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
          succeeded++;
        } catch {
          enqueueSale({
            productId: line.product.id,
            productName: line.product.name,
            quantity: line.quantity,
            discount: line.discount,
            paymentMethod,
            batchId,
          });
        }
      }
      setQueue(getQueue());
      if (succeeded === cartLines.length) {
        toast.success(`Facture enregistree — ${formatFcfa(grandTotal)}`);
      } else {
        toast.warning(`${succeeded}/${cartLines.length} article(s) enregistres, le reste est en attente`);
      }
      setCart([]);
      loadAll();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-x-0 top-14 bottom-0 z-10 flex bg-background md:inset-y-0 md:top-16 md:left-60">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border bg-card px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Caisse
              </p>
              <h1 className="text-xl font-bold tracking-tight">Ventes</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isOnline && (
                <span className="inline-flex h-9 items-center gap-1.5 border border-warning/30 bg-warning/10 px-3 text-xs font-medium text-warning">
                  <WifiOff className="size-3.5" />
                  Offline
                </span>
              )}
              {queue.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9"
                  onClick={runSync}
                  disabled={syncing || !isOnline}
                >
                  <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
                  {queue.length} en attente
                </Button>
              )}
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

          <TabsContent value="caisse" className="mt-0 flex min-h-0 flex-1 flex-col outline-none">
            <div className="shrink-0 space-y-2 border-b border-border bg-card px-4 py-3 md:px-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Chercher une boisson, un plat…"
                  className="h-10 border-border bg-background pl-9"
                />
              </div>
              {visibleCategories.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  <FilterChip
                    active={categoryFilter === ALL_CATEGORIES}
                    onClick={() => setCategoryFilter(ALL_CATEGORIES)}
                  >
                    Tout
                  </FilterChip>
                  {visibleCategories.map((c) => (
                    <FilterChip
                      key={c.id}
                      active={categoryFilter === c.id}
                      onClick={() => setCategoryFilter(c.id)}
                    >
                      {c.name}
                    </FilterChip>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-52 md:px-5 lg:pb-4">
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                {filteredProducts.map((p) => {
                  const qtyInCart = cartQtyByProduct.get(p.id) ?? 0;
                  const active = qtyInCart > 0;
                  const outOfStock = p.currentStock <= qtyInCart;
                  const lowStock = p.currentStock <= p.stockMinThreshold;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => addToCart(p)}
                      className={cn(
                        "relative flex min-h-0 flex-col gap-1 border bg-card px-2 py-2 text-left transition-colors",
                        "hover:border-primary/50 hover:bg-accent/20 disabled:pointer-events-none disabled:opacity-45",
                        active
                          ? "border-l-2 border-l-primary border-primary/30 bg-primary/5"
                          : lowStock
                            ? "border-l-2 border-l-destructive/70 border-border"
                            : "border-border"
                      )}
                    >
                      {active && (
                        <span className="font-figures absolute -right-px -top-px flex size-4 items-center justify-center bg-primary text-[9px] font-bold text-primary-foreground">
                          {qtyInCart}
                        </span>
                      )}
                      <p className="line-clamp-2 pr-3 text-[11px] font-semibold leading-tight tracking-tight">
                        {p.name}
                      </p>
                      <p className="font-figures text-xs font-bold tracking-tight">
                        {formatFcfa(Number(p.unitPrice))}
                      </p>
                    </button>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="flex h-40 items-center justify-center border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">Aucun article trouve.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="historique" className="mt-0 flex min-h-0 flex-1 flex-col outline-none">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-52 md:px-5 lg:pb-4">
              <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
                <KpiCell label="CA du jour" value={formatFcfa(todayStats.revenue)} tone="good" />
                <KpiCell label="Factures" value={String(todayStats.invoices)} />
                <KpiCell label="Ticket moyen" value={formatFcfa(todayStats.avgTicket)} />
                <KpiCell label="Articles vendus" value={String(todayStats.units)} />
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
                              ? "Pas encore de vente aujourd'hui."
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

      <aside
        className={cn(
          "flex w-full max-w-none shrink-0 flex-col border-l border-border bg-card",
          "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-20 max-lg:max-h-[48dvh] max-lg:border-t max-lg:border-l-0 max-lg:shadow-[0_-8px_30px_rgba(0,0,0,0.08)]",
          "lg:w-[22rem] xl:w-[24rem]",
          mainTab === "historique" && "max-lg:hidden"
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 bg-border lg:hidden" />

        <header className="border-b border-border bg-primary/5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Ticket
              </p>
              <p className="mt-0.5 text-sm font-bold tracking-tight">
                {cartLines.length === 0
                  ? "Vide — touchez un produit"
                  : `${cartUnitsLabel} · ${cartLines.length} ligne${cartLines.length > 1 ? "s" : ""}`}
              </p>
            </div>
            {cartLines.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
              >
                Vider
              </button>
            )}
          </div>
        </header>

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
                      <p className="truncate text-sm font-semibold leading-snug">{line.product.name}</p>
                      <p className="font-figures mt-0.5 text-[11px] text-muted-foreground">
                        {formatFcfa(line.unitPrice)} × {line.quantity} {line.product.unitLabel}
                        {line.quantity > 1 ? "(s)" : ""}
                        {line.discount > 0 && (
                          <span className="text-destructive"> − {formatFcfa(line.discount)}</span>
                        )}
                      </p>
                    </div>
                    <p className="font-figures shrink-0 text-sm font-bold tabular-nums">
                      {formatFcfa(line.lineTotal)}
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex h-9 items-center border border-border bg-background">
                      <button
                        type="button"
                        className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => updateQuantity(line.productId, -1)}
                        aria-label="Diminuer"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="font-figures w-8 text-center text-sm font-bold">{line.quantity}</span>
                      <button
                        type="button"
                        className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                        onClick={() => updateQuantity(line.productId, 1)}
                        disabled={line.quantity >= line.product.currentStock}
                        aria-label="Augmenter"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>

                    <Input
                      type="number"
                      min={0}
                      value={line.discount || ""}
                      onChange={(e) => updateDiscount(line.productId, Number(e.target.value))}
                      placeholder="Remise"
                      className="font-figures h-9 min-w-0 flex-1 px-2 text-right text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => removeFromCart(line.productId)}
                      className="flex size-9 shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                      aria-label="Retirer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
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
                        "h-10 border px-2 text-left text-[11px] font-medium leading-tight transition-colors",
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
            {cartLines.length > 0 && (
              <div className="font-figures space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <span>Sous-total</span>
                  <span className="text-foreground">
                    {formatFcfa(cartLines.reduce((s, l) => s + l.subtotal, 0))}
                  </span>
                </div>
                {cartLines.some((l) => l.discount > 0) && (
                  <div className="flex justify-between gap-3">
                    <span>Remises</span>
                    <span className="text-destructive">
                      − {formatFcfa(cartLines.reduce((s, l) => s + l.discount, 0))}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-border pt-3">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="font-figures text-2xl font-bold tracking-tight">
                {cartLines.length > 0 ? formatFcfa(grandTotal) : "—"}
              </span>
            </div>
            <Button
              className="h-12 w-full text-base font-semibold"
              onClick={handleSubmit}
              disabled={cartLines.length === 0 || submitting}
            >
              {submitting ? "Enregistrement…" : "Encaisser"}
            </Button>
          </div>
        </div>
      </aside>

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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
