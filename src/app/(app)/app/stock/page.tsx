"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  PackageCheck,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Category, Product, StockMovementWithProduct } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  KpiCell,
  PAGE_SIZES,
  paginate,
  SortableTh,
  StatusBadge,
  TablePagination,
  type SortDir,
} from "@/components/data-table";

const NO_CATEGORY = "none";
const ALL_CATEGORIES = "all";
const ALL_PRODUCTS = "all";
const ALL_STATUS = "all";
const ALL_TYPES = "all";

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

type ProductSortKey = "name" | "stock" | "threshold" | "status";
type MovementSortKey = "date" | "type" | "article" | "qty";

function stockBarRatio(current: number, threshold: number) {
  const ceiling = Math.max(threshold * 2, 1);
  return Math.min(100, Math.max(0, (current / ceiling) * 100));
}

export default function StockPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState("articles");

  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [search, setSearch] = useState("");
  const [productSort, setProductSort] = useState<{ key: ProductSortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);

  const [movements, setMovements] = useState<StockMovementWithProduct[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [movementProductFilter, setMovementProductFilter] = useState(ALL_PRODUCTS);
  const [movementTypeFilter, setMovementTypeFilter] = useState(ALL_TYPES);
  const [movementSearch, setMovementSearch] = useState("");
  const [movementSort, setMovementSort] = useState<{ key: MovementSortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });
  const [movementPage, setMovementPage] = useState(1);
  const [movementPageSize, setMovementPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [reverseTarget, setReverseTarget] = useState<MovementGroup | null>(null);
  const [reversing, setReversing] = useState(false);

  function loadProducts() {
    apiFetch<{ products: Product[] }>("/api/v1/products").then((d) => setProducts(d.products));
  }

  function loadMovements() {
    apiFetch<{ movements: StockMovementWithProduct[] }>("/api/v1/stock-movements")
      .then((d) => setMovements(d.movements))
      .finally(() => setLoadingMovements(false));
  }

  useEffect(loadProducts, []);
  useEffect(loadMovements, []);
  useEffect(() => {
    apiFetch<{ categories: Category[] }>("/api/v1/categories").then((d) => setCategories(d.categories));
  }, []);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "historique" || t === "articles") setTab(t);
  }, []);

  useEffect(() => {
    setProductPage(1);
  }, [search, categoryFilter, statusFilter, productPageSize, productSort]);

  useEffect(() => {
    setMovementPage(1);
  }, [movementProductFilter, movementTypeFilter, movementSearch, movementPageSize, movementSort]);

  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? "—") : "Sans categorie";

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES
          ? true
          : categoryFilter === NO_CATEGORY
            ? !p.categoryId
            : p.categoryId === categoryFilter;
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const isAlert = p.currentStock <= p.stockMinThreshold;
      const matchesStatus =
        statusFilter === ALL_STATUS
          ? true
          : statusFilter === "alert"
            ? isAlert
            : !isAlert;
      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [products, categoryFilter, search, statusFilter]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    const { key, dir } = productSort;
    const mul = dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (key === "name") return mul * a.name.localeCompare(b.name, "fr");
      if (key === "stock") return mul * (a.currentStock - b.currentStock);
      if (key === "threshold") return mul * (a.stockMinThreshold - b.stockMinThreshold);
      const aAlert = a.currentStock <= a.stockMinThreshold ? 0 : 1;
      const bAlert = b.currentStock <= b.stockMinThreshold ? 0 : 1;
      return mul * (aAlert - bAlert);
    });
    return list;
  }, [filteredProducts, productSort]);

  const productPager = useMemo(
    () => paginate(sortedProducts, productPage, productPageSize),
    [sortedProducts, productPage, productPageSize]
  );

  const alertCount = useMemo(
    () => filteredProducts.filter((p) => p.currentStock <= p.stockMinThreshold).length,
    [filteredProducts]
  );
  const okCount = filteredProducts.length - alertCount;

  const filteredMovements = useMemo(() => {
    const q = movementSearch.trim().toLowerCase();
    return movements.filter((m) => {
      const matchesProduct =
        movementProductFilter === ALL_PRODUCTS || m.productId === movementProductFilter;
      const matchesType = movementTypeFilter === ALL_TYPES || m.type === movementTypeFilter;
      const matchesSearch =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        (m.note?.toLowerCase().includes(q) ?? false);
      return matchesProduct && matchesType && matchesSearch;
    });
  }, [movements, movementProductFilter, movementTypeFilter, movementSearch]);

  const movementGroups = useMemo<MovementGroup[]>(() => {
    const reversedBatchIds = new Set(
      movements.filter((m) => m.reversalOfBatchId).map((m) => m.reversalOfBatchId as string)
    );

    const groups = new Map<string, MovementGroup>();
    const order: string[] = [];

    for (const m of filteredMovements) {
      const key = m.batchId ?? m.id;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          batchId: m.batchId,
          type: m.type,
          note: m.note,
          createdAt: m.createdAt,
          items: [],
          isReversal: !!m.reversalOfBatchId,
          reversed: m.batchId ? reversedBatchIds.has(m.batchId) : false,
        });
        order.push(key);
      }
      groups.get(key)!.items.push(m);
    }

    const list = order.map((k) => groups.get(k)!);
    const { key, dir } = movementSort;
    const mul = dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (key === "date") return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      if (key === "type") return mul * a.type.localeCompare(b.type);
      if (key === "article") {
        const aLabel = a.items.length > 1 ? `${a.items.length} articles` : a.items[0]?.productName ?? "";
        const bLabel = b.items.length > 1 ? `${b.items.length} articles` : b.items[0]?.productName ?? "";
        return mul * aLabel.localeCompare(bLabel, "fr");
      }
      const aQty = a.items.reduce((s, i) => s + Math.abs(i.quantityDelta), 0);
      const bQty = b.items.reduce((s, i) => s + Math.abs(i.quantityDelta), 0);
      return mul * (aQty - bQty);
    });
    return list;
  }, [filteredMovements, movements, movementSort]);

  const movementPager = useMemo(
    () => paginate(movementGroups, movementPage, movementPageSize),
    [movementGroups, movementPage, movementPageSize]
  );

  function toggleProductSort(key: ProductSortKey) {
    setProductSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function toggleMovementSort(key: MovementSortKey) {
    setMovementSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "date" ? "desc" : "asc" }
    );
  }

  function openProductHistory(productId: string) {
    setMovementProductFilter(productId);
    setTab("historique");
  }

  async function handleReverse() {
    if (!reverseTarget?.batchId) return;
    setReversing(true);
    try {
      await apiFetch(`/api/v1/stock-movements/${reverseTarget.batchId}/reverse`, { method: "POST" });
      toast.success("Mouvement annule");
      loadProducts();
      loadMovements();
      setReverseTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setReversing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description="Alertes automatiques des que le seuil minimum est atteint. Catalogue dans Articles."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/app/stock/mouvement?type=entry">
                <ArrowDownLeft className="size-4" /> Entree de stock
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/stock/mouvement?type=adjustment">
                <ArrowUpRight className="size-4" /> Sortie de stock
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList variant="line" className="h-10 w-full justify-start gap-0 overflow-x-auto scroll-touch scrollbar-none rounded-none border-b border-border p-0">
          <TabsTrigger value="articles" className="shrink-0">
            Niveaux
          </TabsTrigger>
          <TabsTrigger value="historique" className="shrink-0">
            Historique
            {!loadingMovements && movementGroups.length > 0 && (
              <span className="font-figures ml-1.5 text-[10px] text-muted-foreground">
                {movementGroups.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-0 space-y-3 outline-none">
          <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
            <KpiCell
              label="Alertes"
              value={String(alertCount)}
              tone={alertCount > 0 ? "bad" : "default"}
              icon={<AlertTriangle className="size-3.5" />}
              active={statusFilter === "alert"}
              onClick={() => setStatusFilter((v) => (v === "alert" ? ALL_STATUS : "alert"))}
            />
            <KpiCell
              label="OK"
              value={String(okCount)}
              tone="good"
              icon={<PackageCheck className="size-3.5" />}
              active={statusFilter === "ok"}
              onClick={() => setStatusFilter((v) => (v === "ok" ? ALL_STATUS : "ok"))}
            />
            <KpiCell label="Articles" value={String(filteredProducts.length)} />
          </div>

          <div className="border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <div className="relative min-w-0 flex-1 basis-48">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un article…"
                  className="h-9 pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES}>Toutes les categories</SelectItem>
                  <SelectItem value={NO_CATEGORY}>Sans categorie</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statusFilter !== ALL_STATUS && (
                <Button type="button" size="sm" variant="outline" onClick={() => setStatusFilter(ALL_STATUS)}>
                  Tous statuts
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <thead className="border-b border-border bg-muted/80">
                  <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    <SortableTh
                      label="Article"
                      active={productSort.key === "name"}
                      dir={productSort.dir}
                      onClick={() => toggleProductSort("name")}
                    />
                    <SortableTh
                      label="Stock"
                      align="right"
                      active={productSort.key === "stock"}
                      dir={productSort.dir}
                      onClick={() => toggleProductSort("stock")}
                    />
                    <SortableTh
                      label="Seuil"
                      align="right"
                      className="hidden sm:table-cell"
                      active={productSort.key === "threshold"}
                      dir={productSort.dir}
                      onClick={() => toggleProductSort("threshold")}
                    />
                    <th className="w-32 px-4 py-2.5 font-semibold text-muted-foreground">Niveau</th>
                    <SortableTh
                      label="Statut"
                      active={productSort.key === "status"}
                      dir={productSort.dir}
                      onClick={() => toggleProductSort("status")}
                    />
                    <th className="w-14 px-3 py-2.5 text-right font-semibold text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productPager.rows.map((p) => {
                    const alert = p.currentStock <= p.stockMinThreshold;
                    const ratio = stockBarRatio(p.currentStock, p.stockMinThreshold);
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "border-b border-border last:border-b-0 transition-colors hover:bg-muted/40",
                          alert ? "border-l-2 border-l-destructive" : "border-l-2 border-l-success/50"
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-semibold leading-snug tracking-tight">{p.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {categoryName(p.categoryId)}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <p
                            className={cn(
                              "font-figures text-base font-bold tabular-nums",
                              alert ? "text-destructive" : "text-foreground"
                            )}
                          >
                            {p.currentStock}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.unitLabel}
                            {p.currentStock !== 1 ? "(s)" : ""}
                          </p>
                        </td>
                        <td className="font-figures hidden px-4 py-2.5 text-right text-muted-foreground sm:table-cell">
                          {p.stockMinThreshold}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="h-1 w-full bg-muted">
                            <div
                              className={cn(
                                "h-full transition-[width]",
                                alert ? "bg-destructive" : "bg-success"
                              )}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                          <p className="font-figures mt-1 text-[10px] text-muted-foreground">
                            {p.currentStock}/{Math.max(p.stockMinThreshold * 2, 1)}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge tone={alert ? "bad" : "good"}>
                            {alert ? "Alerte" : "OK"}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href="/app/stock/mouvement?type=entry">Entree de stock</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href="/app/stock/mouvement?type=adjustment">Sortie de stock</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openProductHistory(p.id)}>
                                Voir l&apos;historique
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href="/app/articles">Modifier l&apos;article</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {productPager.total === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        {products.length === 0
                          ? "Aucun article. Creez-en depuis la page Articles."
                          : "Aucun article ne correspond aux filtres."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              from={productPager.from}
              to={productPager.to}
              total={productPager.total}
              page={productPager.page}
              pageCount={productPager.pageCount}
              pageSize={productPageSize}
              onPageChange={setProductPage}
              onPageSizeChange={(size) => setProductPageSize(size)}
            />
          </div>
        </TabsContent>

        <TabsContent value="historique" className="mt-0 space-y-3 outline-none">
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
            <KpiCell label="Evenements" value={loadingMovements ? "…" : String(movementGroups.length)} />
            <KpiCell
              label="Entrees"
              value={String(
                movementGroups.filter((g) => g.type === "entry" || g.type === "initial").length
              )}
              tone="good"
            />
            <KpiCell
              label="Sorties / ventes"
              value={String(
                movementGroups.filter((g) => g.type === "sale_exit" || g.type === "adjustment").length
              )}
              className="col-span-2 sm:col-span-1"
            />
          </div>

          <div className="border border-border bg-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
              <div className="relative min-w-0 flex-1 basis-48">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  placeholder="Rechercher article ou motif…"
                  className="h-9 pl-9"
                />
              </div>
              {movementProductFilter !== ALL_PRODUCTS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMovementProductFilter(ALL_PRODUCTS)}
                >
                  Effacer le filtre article
                </Button>
              )}
              <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                <SelectTrigger className="h-9 w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TYPES}>Tous les types</SelectItem>
                  {(Object.keys(MOVEMENT_TYPE_LABELS) as StockMovementWithProduct["type"][]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {MOVEMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] border-collapse text-sm">
                <thead className="border-b border-border bg-muted/80">
                  <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    <SortableTh
                      label="Date"
                      active={movementSort.key === "date"}
                      dir={movementSort.dir}
                      onClick={() => toggleMovementSort("date")}
                    />
                    <SortableTh
                      label="Type"
                      active={movementSort.key === "type"}
                      dir={movementSort.dir}
                      onClick={() => toggleMovementSort("type")}
                    />
                    <SortableTh
                      label="Article(s)"
                      active={movementSort.key === "article"}
                      dir={movementSort.dir}
                      onClick={() => toggleMovementSort("article")}
                    />
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground">Motif</th>
                    <SortableTh
                      label="Qte"
                      align="right"
                      active={movementSort.key === "qty"}
                      dir={movementSort.dir}
                      onClick={() => toggleMovementSort("qty")}
                    />
                    <th className="w-14 px-3 py-2.5 text-right font-semibold text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movementPager.rows.map((group) => {
                    const isMulti = group.items.length > 1;
                    const canReverse =
                      !!group.batchId &&
                      !group.reversed &&
                      !group.isReversal &&
                      (group.type === "entry" || group.type === "adjustment");
                    const deltaSample = group.items[0]?.quantityDelta ?? 0;
                    const isPositiveType = group.type === "entry" || group.type === "initial";
                    const detailHref = `/app/stock/historique/${group.key}`;
                    const unitLabel =
                      !isMulti
                        ? products.find((p) => p.id === group.items[0]?.productId)?.unitLabel
                        : null;
                    const absQty = group.items.reduce((s, i) => s + Math.abs(i.quantityDelta), 0);

                    return (
                      <tr
                        key={group.key}
                        onClick={() => router.push(detailHref)}
                        className={cn(
                          "cursor-pointer border-b border-border transition-colors hover:bg-muted/40",
                          group.reversed && "opacity-60",
                          isPositiveType
                            ? "border-l-2 border-l-success/60"
                            : "border-l-2 border-l-destructive/60"
                        )}
                      >
                        <td className="font-figures px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          {formatMovementDate(group.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge tone={isPositiveType ? "entry" : "exit"}>
                            {MOVEMENT_TYPE_LABELS[group.type]}
                          </StatusBadge>
                          {group.reversed && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground">annule</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-medium">
                          {isMulti ? (
                            <span>
                              {group.items.length} articles
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (lot)
                              </span>
                            </span>
                          ) : (
                            group.items[0].productName
                          )}
                        </td>
                        <td className="max-w-[10rem] truncate px-4 py-2.5 text-muted-foreground">
                          {group.note ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {!isMulti ? (
                            <>
                              <span
                                className={cn(
                                  "font-figures text-sm font-bold",
                                  deltaSample > 0 ? "text-success" : "text-destructive"
                                )}
                              >
                                {deltaSample > 0 ? "+" : ""}
                                {deltaSample}
                              </span>
                              {unitLabel && (
                                <p className="text-[11px] text-muted-foreground">
                                  {unitLabel}
                                  {Math.abs(deltaSample) !== 1 ? "(s)" : ""}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="font-figures text-xs font-semibold text-muted-foreground">
                              {absQty}
                            </span>
                          )}
                        </td>
                        <td
                          className="px-3 py-2.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={detailHref}>Consulter</Link>
                              </DropdownMenuItem>
                              {group.reversed ? (
                                <DropdownMenuItem disabled>Deja annule</DropdownMenuItem>
                              ) : canReverse ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setReverseTarget(group)}
                                  >
                                    Annuler le mouvement
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {!loadingMovements && movementPager.total === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        Aucun mouvement ne correspond aux filtres.
                      </td>
                    </tr>
                  )}
                  {loadingMovements && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        Chargement…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              from={movementPager.from}
              to={movementPager.to}
              total={movementPager.total}
              page={movementPager.page}
              pageCount={movementPager.pageCount}
              pageSize={movementPageSize}
              onPageChange={setMovementPage}
              onPageSizeChange={(size) => setMovementPageSize(size)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!reverseTarget} onOpenChange={(open) => !open && setReverseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce mouvement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le stock des {reverseTarget?.items.length ?? 0} article(s) concerne(s) sera remis a son niveau
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

function formatMovementDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
