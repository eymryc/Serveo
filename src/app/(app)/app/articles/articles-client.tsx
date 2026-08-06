"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, MoreHorizontal, Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import {
  PACKAGE_LABEL_OPTIONS,
  UNIT_LABEL_OPTIONS,
  type Category,
  type Product,
} from "@/lib/types";
import { unitLabels, packageLabels } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import {
  KpiCell,
  PAGE_SIZES,
  paginate,
  SortableTh,
  StatusBadge,
  TablePagination,
  type SortDir,
} from "@/components/data-table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NO_CATEGORY = "none";
const NO_PACKAGE = "none";
const ALL_CATEGORIES = "all";
const ALL_STATUS = "all";

type ProductSortKey = "name" | "category" | "unitPrice" | "purchasePrice" | "threshold" | "status";

type FormState = {
  name: string;
  categoryId: string;
  unitLabel: string;
  packageLabel: string;
  unitsPerPackage: string;
  unitPrice: string;
  purchasePrice: string;
  stockMinThreshold: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  categoryId: NO_CATEGORY,
  unitLabel: "bouteille",
  packageLabel: NO_PACKAGE,
  unitsPerPackage: "",
  unitPrice: "",
  purchasePrice: "",
  stockMinThreshold: "5",
};

function normalizeUnitLabel(value: string): string {
  const lower = value.trim().toLowerCase();
  return (unitLabels as readonly string[]).includes(lower) ? lower : "bouteille";
}

function normalizePackageLabel(value: string | null): string {
  if (!value) return NO_PACKAGE;
  const lower = value.trim().toLowerCase();
  return (packageLabels as readonly string[]).includes(lower) ? lower : NO_PACKAGE;
}

export default function ArticlesPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [sort, setSort] = useState<{ key: ProductSortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);

  function loadProducts() {
    apiFetch<{ products: Product[] }>("/api/v1/products?includeInactive=1").then((d) =>
      setProducts(d.products)
    );
  }

  useEffect(loadProducts, []);
  useEffect(() => {
    apiFetch<{ categories: Category[] }>("/api/v1/categories").then((d) => setCategories(d.categories));
  }, []);
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, pageSize, sort]);

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
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        categoryName(p.categoryId).toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === ALL_STATUS
          ? true
          : statusFilter === "active"
            ? !!p.isActive
            : !p.isActive;
      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [products, categoryFilter, search, statusFilter, categories]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (key === "name") return mul * a.name.localeCompare(b.name, "fr");
      if (key === "category") {
        return mul * categoryName(a.categoryId).localeCompare(categoryName(b.categoryId), "fr");
      }
      if (key === "unitPrice") return mul * (Number(a.unitPrice) - Number(b.unitPrice));
      if (key === "purchasePrice") {
        return mul * (Number(a.purchasePrice ?? 0) - Number(b.purchasePrice ?? 0));
      }
      if (key === "threshold") return mul * (a.stockMinThreshold - b.stockMinThreshold);
      return mul * (Number(b.isActive) - Number(a.isActive));
    });
    return list;
  }, [filteredProducts, sort, categories]);

  const pager = useMemo(
    () => paginate(sortedProducts, page, pageSize),
    [sortedProducts, page, pageSize]
  );

  const activeCount = useMemo(
    () => filteredProducts.filter((p) => p.isActive).length,
    [filteredProducts]
  );
  const inactiveCount = filteredProducts.length - activeCount;

  function toggleSort(key: ProductSortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      categoryId: p.categoryId ?? NO_CATEGORY,
      unitLabel: normalizeUnitLabel(p.unitLabel),
      packageLabel: normalizePackageLabel(p.packageLabel),
      unitsPerPackage: p.unitsPerPackage ? String(p.unitsPerPackage) : "",
      unitPrice: p.unitPrice,
      purchasePrice: p.purchasePrice ?? "0",
      stockMinThreshold: String(p.stockMinThreshold),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const hasPackage = form.packageLabel !== NO_PACKAGE;
    const payload = {
      name: form.name,
      categoryId: form.categoryId === NO_CATEGORY ? null : form.categoryId,
      unitLabel: form.unitLabel || "bouteille",
      packageLabel: hasPackage ? form.packageLabel : null,
      unitsPerPackage: hasPackage && form.unitsPerPackage ? Number(form.unitsPerPackage) : null,
      unitPrice: Number(form.unitPrice),
      purchasePrice: Number(form.purchasePrice || 0),
      stockMinThreshold: Number(form.stockMinThreshold || 5),
    };

    try {
      if (editing) {
        await apiFetch(`/api/v1/products/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Article modifie");
      } else {
        await apiFetch("/api/v1/products", { method: "POST", body: JSON.stringify(payload) });
        toast.success(`Article "${form.name}" cree — utilisez Stock pour saisir le stock de depart`);
      }
      setDialogOpen(false);
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(p: Product) {
    try {
      await apiFetch(`/api/v1/products/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: p.isActive ? 0 : 1 }),
      });
      toast.success(p.isActive ? "Article desactive" : "Article reactive");
      setDeactivateTarget(null);
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  const unitDisplay =
    UNIT_LABEL_OPTIONS.find((o) => o.value === form.unitLabel)?.label.toLowerCase() ?? form.unitLabel;

  return (
    <div className="container mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Articles"
        description="Le catalogue de vos produits — Stock et Ventes s'y referent directement."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nouvel article
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-px border border-border bg-border">
          <KpiCell
            label="Articles"
            value={String(filteredProducts.length)}
            icon={<Package className="size-3.5" />}
            active={statusFilter === ALL_STATUS}
            onClick={() => setStatusFilter(ALL_STATUS)}
          />
          <KpiCell
            label="Actifs"
            value={String(activeCount)}
            tone="good"
            active={statusFilter === "active"}
            onClick={() => setStatusFilter((v) => (v === "active" ? ALL_STATUS : "active"))}
          />
          <KpiCell
            label="Desactives"
            value={String(inactiveCount)}
            tone={inactiveCount > 0 ? "bad" : "default"}
            icon={<Archive className="size-3.5" />}
            active={statusFilter === "inactive"}
            onClick={() => setStatusFilter((v) => (v === "inactive" ? ALL_STATUS : "inactive"))}
          />
        </div>

        <div className="border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative min-w-0 flex-1 basis-48">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un article ou une categorie…"
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
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <thead className="border-b border-border bg-muted/80">
                <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  <SortableTh
                    label="Article"
                    active={sort.key === "name"}
                    dir={sort.dir}
                    onClick={() => toggleSort("name")}
                  />
                  <th className="hidden px-4 py-2.5 font-semibold text-muted-foreground lg:table-cell">
                    Conditionnement
                  </th>
                  <SortableTh
                    label="Prix vente"
                    align="right"
                    active={sort.key === "unitPrice"}
                    dir={sort.dir}
                    onClick={() => toggleSort("unitPrice")}
                  />
                  <SortableTh
                    label="Prix achat"
                    align="right"
                    active={sort.key === "purchasePrice"}
                    dir={sort.dir}
                    onClick={() => toggleSort("purchasePrice")}
                    className="hidden sm:table-cell"
                  />
                  <SortableTh
                    label="Seuil"
                    align="right"
                    active={sort.key === "threshold"}
                    dir={sort.dir}
                    onClick={() => toggleSort("threshold")}
                    className="hidden md:table-cell"
                  />
                  <SortableTh
                    label="Statut"
                    active={sort.key === "status"}
                    dir={sort.dir}
                    onClick={() => toggleSort("status")}
                  />
                  <th className="w-14 px-3 py-2.5 text-right font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pager.rows.map((p) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-border last:border-b-0 transition-colors hover:bg-muted/40",
                      p.isActive
                        ? "border-l-2 border-l-success/50"
                        : "border-l-2 border-l-muted-foreground/40 opacity-55"
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-semibold leading-snug tracking-tight">{p.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {categoryName(p.categoryId)}
                        <span className="mx-1.5 text-border">·</span>
                        {p.unitLabel}
                      </p>
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">
                      {p.packageLabel && p.unitsPerPackage
                        ? `${p.packageLabel} (${p.unitsPerPackage} ${p.unitLabel}s)`
                        : "A l'unite"}
                    </td>
                    <td className="font-figures px-4 py-2.5 text-right text-base font-bold tabular-nums">
                      {formatFcfa(Number(p.unitPrice))}
                    </td>
                    <td className="font-figures hidden px-4 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {formatFcfa(Number(p.purchasePrice ?? 0))}
                    </td>
                    <td className="font-figures hidden px-4 py-2.5 text-right text-muted-foreground md:table-cell">
                      {p.stockMinThreshold}{" "}
                      <span className="text-[11px]">
                        {p.unitLabel}
                        {p.stockMinThreshold !== 1 ? "(s)" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge tone={p.isActive ? "good" : "neutral"}>
                        {p.isActive ? "Actif" : "Desactive"}
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
                          <DropdownMenuItem onClick={() => openEdit(p)}>Modifier</DropdownMenuItem>
                          <DropdownMenuItem
                            variant={p.isActive ? "destructive" : "default"}
                            onClick={() =>
                              p.isActive ? setDeactivateTarget(p) : handleToggleActive(p)
                            }
                          >
                            {p.isActive ? "Desactiver" : "Reactiver"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {pager.total === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {products.length === 0
                        ? "Aucun article. Creez le premier avec « Nouvel article »."
                        : "Aucun article ne correspond aux filtres."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            from={pager.from}
            to={pager.to}
            total={pager.total}
            page={pager.page}
            pageCount={pager.pageCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => setPageSize(size)}
          />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl" showCloseButton>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Le stock ne se modifie pas ici — utilisez Stock pour les entrees."
                  : "L'article demarre a 0 en stock — utilisez Stock pour saisir la quantite de depart."}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nom de l&apos;article</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="space-y-1.5">
                  <Label>Categorie</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>Sans categorie</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Prix d&apos;achat (FCFA)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prix de vente (FCFA)</Label>
                  <Input
                    type="number"
                    min={0}
                    required
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unite de vente et de stock</Label>
                  <Select
                    value={form.unitLabel}
                    onValueChange={(v) => setForm({ ...form, unitLabel: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir l'unite..." />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_LABEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Format d&apos;achat fournisseur</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={form.packageLabel}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        packageLabel: v,
                        unitsPerPackage: v === NO_PACKAGE ? "" : form.unitsPerPackage,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Comment vous achetez..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PACKAGE}>A l&apos;unite (pas de colis)</SelectItem>
                      {PACKAGE_LABEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    required={form.packageLabel !== NO_PACKAGE}
                    disabled={form.packageLabel === NO_PACKAGE}
                    placeholder={`${unitDisplay}s / colis`}
                    value={form.unitsPerPackage}
                    onChange={(e) => setForm({ ...form, unitsPerPackage: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ex. : casier de 24 {unitDisplay}s — pour saisir les receptions de stock
                  par colis plutot qu&apos;a l&apos;unite.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Seuil d&apos;alerte stock ({unitDisplay}s)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stockMinThreshold}
                  onChange={(e) => setForm({ ...form, stockMinThreshold: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {editing ? "Enregistrer" : "Creer l'article"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactiver {deactivateTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;article disparait de Ventes et Stock mais son historique de ventes est
              conserve. Vous pourrez le reactiver a tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deactivateTarget && handleToggleActive(deactivateTarget)}>
              Desactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
