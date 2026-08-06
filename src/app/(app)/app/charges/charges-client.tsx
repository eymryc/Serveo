"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Plus, Receipt, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type Category, type Expense, type Organization } from "@/lib/types";
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

const ALL_CATEGORIES = "all";
const NO_CATEGORY = "none";
const ALL_PAYMENTS = "all";

type ExpenseSortKey = "date" | "label" | "category" | "amount" | "payment";

export default function ChargesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activePaymentMethods, setActivePaymentMethods] = useState<string[]>(
    Object.keys(PAYMENT_METHOD_LABELS)
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("especes");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [paymentFilter, setPaymentFilter] = useState(ALL_PAYMENTS);
  const [sort, setSort] = useState<{ key: ExpenseSortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);

  function loadExpenses() {
    apiFetch<{ expenses: Expense[] }>("/api/v1/expenses").then((d) => setExpenses(d.expenses));
  }

  useEffect(loadExpenses, []);
  useEffect(() => {
    apiFetch<{ categories: Category[] }>("/api/v1/expense-categories").then((d) => {
      setCategories(d.categories);
      if (d.categories[0]) setCategoryId((prev) => prev || d.categories[0].id);
    });
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
    setPage(1);
  }, [search, categoryFilter, paymentFilter, pageSize, sort]);

  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? "—") : "Sans categorie";

  const paymentLabel = (value: string) => PAYMENT_METHOD_LABELS[value] ?? value;

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((ex) => {
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES
          ? true
          : categoryFilter === NO_CATEGORY
            ? !ex.categoryId
            : ex.categoryId === categoryFilter;
      const matchesPayment =
        paymentFilter === ALL_PAYMENTS ? true : ex.paymentMethod === paymentFilter;
      const matchesSearch =
        !q ||
        ex.label.toLowerCase().includes(q) ||
        categoryName(ex.categoryId).toLowerCase().includes(q) ||
        paymentLabel(ex.paymentMethod).toLowerCase().includes(q);
      return matchesCategory && matchesPayment && matchesSearch;
    });
  }, [expenses, categoryFilter, paymentFilter, search, categories]);

  const sortedExpenses = useMemo(() => {
    const list = [...filteredExpenses];
    const { key, dir } = sort;
    const mul = dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (key === "date") {
        return mul * (new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime());
      }
      if (key === "label") return mul * a.label.localeCompare(b.label, "fr");
      if (key === "category") {
        return mul * categoryName(a.categoryId).localeCompare(categoryName(b.categoryId), "fr");
      }
      if (key === "amount") return mul * (Number(a.amount) - Number(b.amount));
      return mul * paymentLabel(a.paymentMethod).localeCompare(paymentLabel(b.paymentMethod), "fr");
    });
    return list;
  }, [filteredExpenses, sort, categories]);

  const pager = useMemo(
    () => paginate(sortedExpenses, page, pageSize),
    [sortedExpenses, page, pageSize]
  );

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [filteredExpenses]
  );
  const averageAmount =
    filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const ex of filteredExpenses) {
      map.set(ex.paymentMethod, (map.get(ex.paymentMethod) ?? 0) + Number(ex.amount));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  function toggleSort(key: ExpenseSortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function resetForm() {
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setLabel("");
    setAmount("");
    setCategoryId(categories[0]?.id ?? "");
    setPaymentMethod(activePaymentMethods[0] ?? "especes");
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify({
          expenseDate,
          label,
          categoryId: categoryId || null,
          amount: Number(amount),
          paymentMethod,
        }),
      });
      toast.success("Depense enregistree");
      setDialogOpen(false);
      resetForm();
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charges"
        description="Suivi des depenses du bar — reserve au gerant."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nouvelle charge
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
          <KpiCell
            label="Total"
            value={formatFcfa(totalAmount)}
            icon={<Wallet className="size-3.5" />}
            active={paymentFilter === ALL_PAYMENTS}
            onClick={() => setPaymentFilter(ALL_PAYMENTS)}
          />
          <KpiCell
            label="Depenses"
            value={String(filteredExpenses.length)}
            icon={<Receipt className="size-3.5" />}
          />
          <KpiCell
            label="Moyenne"
            value={formatFcfa(Math.round(averageAmount))}
            icon={<Banknote className="size-3.5" />}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {paymentBreakdown.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {paymentBreakdown.map(([method, sum]) => (
              <button
                key={method}
                type="button"
                onClick={() =>
                  setPaymentFilter((v) => (v === method ? ALL_PAYMENTS : method))
                }
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 border px-2.5 py-1.5 text-xs transition-colors",
                  paymentFilter === method
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="font-medium">{paymentLabel(method)}</span>
                <span className="font-figures font-semibold tabular-nums">
                  {formatFcfa(sum)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <div className="relative min-w-0 flex-1 basis-48">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un libelle, une categorie…"
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
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-9 w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PAYMENTS}>Tous paiements</SelectItem>
                {activePaymentMethods.map((value) => (
                  <SelectItem key={value} value={value}>
                    {paymentLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead className="border-b border-border bg-muted/80">
                <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  <SortableTh
                    label="Date"
                    active={sort.key === "date"}
                    dir={sort.dir}
                    onClick={() => toggleSort("date")}
                  />
                  <SortableTh
                    label="Libelle"
                    active={sort.key === "label"}
                    dir={sort.dir}
                    onClick={() => toggleSort("label")}
                  />
                  <SortableTh
                    label="Categorie"
                    active={sort.key === "category"}
                    dir={sort.dir}
                    onClick={() => toggleSort("category")}
                    className="hidden sm:table-cell"
                  />
                  <SortableTh
                    label="Montant"
                    align="right"
                    active={sort.key === "amount"}
                    dir={sort.dir}
                    onClick={() => toggleSort("amount")}
                  />
                  <SortableTh
                    label="Paiement"
                    active={sort.key === "payment"}
                    dir={sort.dir}
                    onClick={() => toggleSort("payment")}
                  />
                </tr>
              </thead>
              <tbody>
                {pager.rows.map((ex) => (
                  <tr
                    key={ex.id}
                    className="border-b border-l-2 border-border border-l-primary/40 transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="font-figures px-4 py-2.5 text-muted-foreground tabular-nums">
                      {new Date(ex.expenseDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold leading-snug tracking-tight">{ex.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                        {categoryName(ex.categoryId)}
                      </p>
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                      {categoryName(ex.categoryId)}
                    </td>
                    <td className="font-figures px-4 py-2.5 text-right text-base font-bold tabular-nums">
                      {formatFcfa(Number(ex.amount))}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge tone="neutral">{paymentLabel(ex.paymentMethod)}</StatusBadge>
                    </td>
                  </tr>
                ))}
                {pager.total === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {expenses.length === 0
                        ? "Aucune charge sur la periode. Ajoutez-en avec « Nouvelle charge »."
                        : "Aucune charge ne correspond aux filtres."}
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
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Nouvelle charge</DialogTitle>
              <DialogDescription>
                Enregistrez une depense de la periode en cours.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Montant (FCFA)</Label>
                <Input
                  type="number"
                  min={0}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Libelle</Label>
                <Input
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex. Loyer du mois"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categorie</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Categorie..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {categories.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        Ajoutez des categories dans Parametres.
                      </p>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activePaymentMethods.map((value) => (
                      <SelectItem key={value} value={value}>
                        {paymentLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
