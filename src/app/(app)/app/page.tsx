"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  PackageSearch,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa, formatPercent } from "@/lib/format";
import { DEFAULT_PERIOD_SELECTION, periodSelectionQuery } from "@/lib/dashboard-math";
import { PAYMENT_METHOD_LABELS, type DashboardData, type PeriodSelection, type Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { BreakdownBarList } from "@/components/dashboard/breakdown-bar-list";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";

function DashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-none" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-none" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD_SELECTION);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recharge le dashboard au montage et à chaque changement de période, pattern volontaire
    setLoading(true);
    setError(null);
    apiFetch<DashboardData>(`/api/v1/dashboard?${periodSelectionQuery(period)}`)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period.preset, period.customFrom, period.customTo]);

  const shell = (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Compte de résultat simplifié — CA, marge brute, charges et bénéfice."
      />
      <PeriodSelector layout="bar" value={period} onChange={setPeriod} />
    </>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {shell}
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        {shell}
        <DashboardContentSkeleton />
      </div>
    );
  }

  if (data.restricted) {
    return (
      <div className={cn("space-y-6", loading && "opacity-70")}>
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
  const grossTone = data.result.grossMargin >= 0 ? "good" : "bad";

  return (
    <div className="space-y-6">
      {shell}

      <div className={cn("space-y-6", loading && "pointer-events-none opacity-60")}>
      {/* Cascade comptable : CA → marge brute (− COGS) → bénéfice (− charges) */}
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
              Marge brute
            </p>
            <TrendingUp className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <p
            className={cn(
              "font-figures mt-1.5 text-2xl font-bold tracking-tight md:text-3xl",
              grossTone === "good" ? "text-success" : "text-destructive"
            )}
          >
            {formatFcfa(data.result.grossMargin)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPercent(data.result.grossMarginPct)} apres cout d&apos;achat{" "}
            {formatFcfa(data.result.cogs)}
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
            Marge nette {formatPercent(data.result.marginPct)}
          </p>
        </div>
      </div>

      {/* Secondaire : activite */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Panier moyen"
          hint="CA net ÷ nombre de ventes"
          value={formatFcfa(data.revenue.avgTicket)}
          icon={ShoppingCart}
        />
        <StatCard label="Nb ventes" value={String(data.revenue.salesCount)} icon={TrendingUp} />
        <div className="flex flex-col justify-between border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Alertes stock
            </p>
            <PackageSearch className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <p
            className={cn(
              "font-figures mt-2 text-lg font-bold",
              data.stock.alertsCount > 0 ? "text-destructive" : "text-success"
            )}
          >
            {data.stock.alertsCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Stock {formatFcfa(data.stock.totalValue)} · {data.stock.activeProductsCount} articles
          </p>
        </div>
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

      <div className="space-y-4">
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
            <RevenueTrendChart
              data={data.timeSeries}
              from={data.period.from}
              to={data.period.to}
              granularity={data.period.granularity}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Top articles</h3>
              <BreakdownBarList
                rows={data.topProducts.slice(0, 5).map((p) => ({ label: p.name, value: p.amount }))}
                emptyLabel="Aucune vente sur la periode."
              />
            </div>
            <div className="border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Paiements</h3>
              <BreakdownBarList
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
            <Link
              href="/app/stock"
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
            </Link>
          )}
      </div>
      </div>
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
