"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Package,
  PackageSearch,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa, formatPercent } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type DashboardData, type PeriodKey, type Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { PieBreakdownChart } from "@/components/dashboard/pie-breakdown-chart";
import { HorizontalBarChart } from "@/components/dashboard/horizontal-bar-chart";

function DataTable({
  columns,
  children,
}: {
  columns: { label: string; align?: "left" | "right"; className?: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        <thead className="border-b border-border bg-muted/80">
          <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {columns.map((col) => (
              <th
                key={col.label}
                className={cn(
                  "px-4 py-2.5 font-semibold",
                  col.align === "right" && "text-right",
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-none" />
        ))}
      </div>
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [tab, setTab] = useState("apercu");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    apiFetch<DashboardData>(`/api/v1/dashboard?period=${period}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [period]);

  if (error) {
    return (
      <div>
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      </div>
    );
  }
  if (!data) return <DashboardSkeleton />;

  if (data.restricted) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tableau de bord"
          description="Vue operationnelle — les chiffres financiers sont reserves au gerant."
          action={<PeriodSelector value={period} onChange={setPeriod} />}
        />

        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
          <div className="bg-card px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Ventes
            </p>
            <p className="font-figures mt-1 text-2xl font-bold">{data.salesCount}</p>
          </div>
          <div className="bg-card px-4 py-3">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Articles actifs
            </p>
            <p className="font-figures mt-1 text-2xl font-bold">{data.activeProductsCount}</p>
          </div>
          <div className="col-span-2 bg-card px-4 py-3 sm:col-span-1">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Alertes stock
            </p>
            <p
              className={cn(
                "font-figures mt-1 text-2xl font-bold",
                data.stock.alertsCount > 0 ? "text-destructive" : "text-success"
              )}
            >
              {data.stock.alertsCount}
            </p>
          </div>
        </div>

        <StockAlertsPanel alerts={data.stock.alerts} alertsCount={data.stock.alertsCount} />
      </div>
    );
  }

  const profitTone = data.result.netProfit >= 0 ? "good" : "bad";
  const periodLabel = `${new Date(data.period.from).toLocaleDateString("fr-FR")} — ${new Date(data.period.to).toLocaleDateString("fr-FR")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description={`Periode : ${periodLabel}`}
        action={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      {/* KPI strip — toujours visible */}
      <div className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <div className="bg-card px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              CA net
            </p>
            <Banknote className="size-3.5 text-primary" strokeWidth={1.75} />
          </div>
          <p className="font-figures mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">
            {formatFcfa(data.revenue.net)}
          </p>
          {data.revenue.deltaPct !== null && (
            <p
              className={cn(
                "font-figures mt-1 text-xs",
                data.revenue.deltaPct >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {data.revenue.deltaPct >= 0 ? "+" : ""}
              {data.revenue.deltaPct.toFixed(1)}% vs periode prec.
            </p>
          )}
        </div>
        <div className="bg-card px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Benefice net
            </p>
            <Wallet className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <p
            className={cn(
              "font-figures mt-1.5 text-2xl font-bold tracking-tight md:text-3xl",
              profitTone === "good" ? "text-success" : "text-destructive"
            )}
          >
            {formatFcfa(data.result.netProfit)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Marge {formatPercent(data.result.marginPct)}
          </p>
        </div>
        <div className="bg-card px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Charges
            </p>
            <Receipt className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <p className="font-figures mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">
            {formatFcfa(data.expenses.total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.expenses.byCategory.length} categorie
            {data.expenses.byCategory.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-card px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Alertes stock
            </p>
            <PackageSearch className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <p
            className={cn(
              "font-figures mt-1.5 text-2xl font-bold tracking-tight md:text-3xl",
              data.stock.alertsCount > 0 ? "text-destructive" : "text-success"
            )}
          >
            {data.stock.alertsCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Stock {formatFcfa(data.stock.totalValue)}
          </p>
        </div>
      </div>

      {/* Secondaire : activite */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Ticket moyen" value={formatFcfa(data.revenue.avgTicket)} icon={ShoppingCart} />
        <StatCard label="Nb ventes" value={String(data.revenue.salesCount)} icon={TrendingUp} />
        <StatCard label="Articles actifs" value={String(data.stock.activeProductsCount)} icon={Package} />
        {data.result.monthlyRevenueTarget !== null ? (
          <div className="flex flex-col justify-between border border-border bg-card p-4">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Objectif mensuel
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-figures text-lg font-bold">
                  {formatPercent(data.result.goalProgressPct)}
                </span>
                <span className="font-figures text-xs text-muted-foreground">
                  {formatFcfa(data.result.monthlyRevenueTarget)}
                </span>
              </div>
              <Progress value={Math.min(100, Math.max(0, data.result.goalProgressPct ?? 0))} />
            </div>
          </div>
        ) : (
          <StatCard label="Objectif" value="—" />
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList variant="line" className="h-10 w-full justify-start gap-0 overflow-x-auto scroll-touch scrollbar-none rounded-none border-b border-border p-0">
          <TabsTrigger value="apercu" className="shrink-0">
            Apercu
          </TabsTrigger>
          <TabsTrigger value="ventes" className="shrink-0">
            Ventes
          </TabsTrigger>
          <TabsTrigger value="charges" className="shrink-0">
            Charges
          </TabsTrigger>
          <TabsTrigger value="stock" className="shrink-0">
            Stock
            {data.stock.alertsCount > 0 && (
              <span className="font-figures ml-1.5 text-[10px] text-destructive">
                {data.stock.alertsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apercu" className="mt-0 space-y-4 outline-none">
          <div className="border border-border bg-card p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Evolution du CA</h2>
              <p className="text-xs text-muted-foreground">
                {data.period.granularity === "hour"
                  ? "Par heure"
                  : data.period.granularity === "month"
                    ? "Par mois"
                    : "Par jour"}
              </p>
            </div>
            <RevenueTrendChart data={data.timeSeries} granularity={data.period.granularity} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Top articles</h3>
              <HorizontalBarChart
                rows={data.topProducts.map((p) => ({ label: p.name, value: p.amount }))}
                emptyLabel="Aucune vente sur la periode."
              />
            </div>
            <div className="border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Paiements</h3>
              <HorizontalBarChart
                rows={data.paymentMethodBreakdown.map((r) => ({
                  label: PAYMENT_METHOD_LABELS[r.method] ?? r.method,
                  value: r.amount,
                }))}
                categorical
                emptyLabel="Aucune vente sur la periode."
              />
            </div>
          </div>

          {data.stock.alertsCount > 0 && (
            <button
              type="button"
              onClick={() => setTab("stock")}
              className="flex w-full items-center justify-between gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-left transition-colors hover:bg-destructive/10"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">
                  {data.stock.alertsCount} article{data.stock.alertsCount > 1 ? "s" : ""} a
                  reapprovisionner
                </span>
              </div>
              <span className="text-xs font-medium text-destructive">Voir le stock →</span>
            </button>
          )}
        </TabsContent>

        <TabsContent value="ventes" className="mt-0 space-y-4 outline-none">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">Ventes par categorie</h2>
              <DataTable
                columns={[
                  { label: "Categorie" },
                  { label: "CA", align: "right" },
                  { label: "Part", align: "right" },
                ]}
              >
                {data.revenueByCategory.length === 0 ? (
                  <EmptyRow colSpan={3} label="Aucune vente sur la periode." />
                ) : (
                  data.revenueByCategory.map((row) => (
                    <tr
                      key={row.category}
                      className="border-b border-border last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-2.5 font-medium">{row.category}</td>
                      <td className="font-figures px-4 py-2.5 text-right font-semibold">
                        {formatFcfa(row.amount)}
                      </td>
                      <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                        {formatPercent(row.percentage)}
                      </td>
                    </tr>
                  ))
                )}
              </DataTable>
            </div>
            <div className="border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Repartition</h3>
              <PieBreakdownChart rows={data.revenueByCategory} />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight">Moyens de paiement</h2>
            <DataTable
              columns={[
                { label: "Mode" },
                { label: "Montant", align: "right" },
                { label: "Part", align: "right" },
              ]}
            >
              {data.paymentMethodBreakdown.length === 0 ? (
                <EmptyRow colSpan={3} label="Aucune vente sur la periode." />
              ) : (
                data.paymentMethodBreakdown.map((row) => (
                  <tr
                    key={row.method}
                    className="border-b border-border last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {PAYMENT_METHOD_LABELS[row.method] ?? row.method}
                    </td>
                    <td className="font-figures px-4 py-2.5 text-right font-semibold">
                      {formatFcfa(row.amount)}
                    </td>
                    <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                      {formatPercent(row.percentage)}
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight">Top 5 articles</h2>
            <DataTable
              columns={[
                { label: "Article" },
                { label: "Qte", align: "right" },
                { label: "CA", align: "right" },
              ]}
            >
              {data.topProducts.length === 0 ? (
                <EmptyRow colSpan={3} label="Aucune vente sur la periode." />
              ) : (
                data.topProducts.map((p, i) => (
                  <tr
                    key={p.productId}
                    className="border-b border-border last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-figures mr-2 text-xs text-muted-foreground">
                        {i + 1}.
                      </span>
                      <span className="font-medium">{p.name}</span>
                    </td>
                    <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                      {p.quantity}
                    </td>
                    <td className="font-figures px-4 py-2.5 text-right font-semibold">
                      {formatFcfa(p.amount)}
                    </td>
                  </tr>
                ))
              )}
            </DataTable>
          </div>
        </TabsContent>

        <TabsContent value="charges" className="mt-0 space-y-4 outline-none">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="border border-border bg-card p-4">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-tight">Repartition</h2>
                <span className="font-figures text-sm font-bold">{formatFcfa(data.expenses.total)}</span>
              </div>
              <HorizontalBarChart
                rows={data.expenses.byCategory.map((r) => ({ label: r.category, value: r.amount }))}
                categorical
                emptyLabel="Aucune charge sur la periode."
              />
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">Detail par categorie</h2>
              <DataTable
                columns={[
                  { label: "Categorie" },
                  { label: "Montant", align: "right" },
                  { label: "Part", align: "right" },
                ]}
              >
                {data.expenses.byCategory.length === 0 ? (
                  <EmptyRow colSpan={3} label="Aucune charge sur la periode." />
                ) : (
                  data.expenses.byCategory.map((row) => (
                    <tr
                      key={row.category}
                      className="border-b border-border last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-2.5 font-medium">{row.category}</td>
                      <td className="font-figures px-4 py-2.5 text-right font-semibold">
                        {formatFcfa(row.amount)}
                      </td>
                      <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                        {formatPercent(row.percentage)}
                      </td>
                    </tr>
                  ))
                )}
              </DataTable>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">
              CA {formatFcfa(data.revenue.net)} − Charges {formatFcfa(data.expenses.total)} ={" "}
              <span
                className={cn(
                  "font-figures font-bold",
                  profitTone === "good" ? "text-success" : "text-destructive"
                )}
              >
                {formatFcfa(data.result.netProfit)}
              </span>
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/charges">
                Gerer les charges <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="mt-0 space-y-4 outline-none">
          <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
            <div className="bg-card px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Valeur stock
              </p>
              <p className="font-figures mt-1 text-xl font-bold">{formatFcfa(data.stock.totalValue)}</p>
            </div>
            <div className="bg-card px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Articles actifs
              </p>
              <p className="font-figures mt-1 text-xl font-bold">{data.stock.activeProductsCount}</p>
            </div>
            <div className="col-span-2 bg-card px-4 py-3 sm:col-span-1">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Alertes
              </p>
              <p
                className={cn(
                  "font-figures mt-1 text-xl font-bold",
                  data.stock.alertsCount > 0 ? "text-destructive" : "text-success"
                )}
              >
                {data.stock.alertsCount}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Articles a reapprovisionner</h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/stock">
                  Ouvrir le stock <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <DataTable
              columns={[
                { label: "Article" },
                { label: "Stock", align: "right" },
                { label: "Seuil", align: "right" },
                { label: "Ecart", align: "right" },
              ]}
            >
              {data.stock.alerts.length === 0 ? (
                <EmptyRow colSpan={4} label="Aucune alerte — stock OK." />
              ) : (
                data.stock.alerts.map((p) => {
                  const deficit = p.currentStock - p.stockMinThreshold;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border border-l-2 border-l-destructive last:border-b-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-2.5 font-medium">{p.name}</td>
                      <td className="font-figures px-4 py-2.5 text-right font-bold text-destructive">
                        {p.currentStock} {p.unitLabel}
                        {p.currentStock !== 1 ? "(s)" : ""}
                      </td>
                      <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                        {p.stockMinThreshold}
                      </td>
                      <td className="font-figures px-4 py-2.5 text-right text-destructive">
                        {deficit}
                      </td>
                    </tr>
                  );
                })
              )}
            </DataTable>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StockAlertsPanel({
  alerts,
  alertsCount,
}: {
  alerts: Product[];
  alertsCount: number;
}) {
  if (alertsCount === 0) {
    return (
      <div className="border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        Aucune alerte stock.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight">
          Articles a reapprovisionner ({alertsCount})
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/stock">
            Ouvrir le stock <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="border-b border-border bg-muted/80">
            <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              <th className="px-4 py-2.5">Article</th>
              <th className="px-4 py-2.5 text-right">Stock</th>
              <th className="px-4 py-2.5 text-right">Seuil</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5 font-medium">{p.name}</td>
                <td className="font-figures px-4 py-2.5 text-right text-destructive">
                  {p.currentStock}
                </td>
                <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                  {p.stockMinThreshold}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
