"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  PackageSearch,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa, formatPercent } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type DashboardData, type PeriodKey } from "@/lib/types";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { PieBreakdownChart } from "@/components/dashboard/pie-breakdown-chart";
import { HorizontalBarChart } from "@/components/dashboard/horizontal-bar-chart";

function CategoryTable({
  rows,
  emptyLabel,
}: {
  rows: { category: string; amount: number; percentage: number }[];
  emptyLabel: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <Table>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.category}>
            <TableCell className="text-muted-foreground">{row.category}</TableCell>
            <TableCell className="font-figures text-right">{formatFcfa(row.amount)}</TableCell>
            <TableCell className="font-figures w-16 text-right text-muted-foreground">
              {formatPercent(row.percentage)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StockAlerts({ alerts, alertsCount }: { alerts: DashboardData["stock"]["alerts"]; alertsCount: number }) {
  if (alerts.length === 0) return null;
  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertTitle>Articles a reapprovisionner ({alertsCount})</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1">
          {alerts.map((p) => (
            <li key={p.id} className="flex justify-between gap-4">
              <span>{p.name}</span>
              <span className="font-figures shrink-0">
                {p.currentStock} / seuil {p.stockMinThreshold}
              </span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>(`/api/v1/dashboard?period=${period}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [period]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{error}</AlertTitle>
      </Alert>
    );
  }
  if (!data) return <DashboardSkeleton />;

  // Vue barman : uniquement le stock, pas les chiffres financiers du bar.
  if (data.restricted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
          <p className="text-sm text-muted-foreground">
            Les chiffres financiers du bar sont reserves au gerant.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Alertes stock"
            value={String(data.stock.alertsCount)}
            icon={PackageSearch}
            tone={data.stock.alertsCount > 0 ? "bad" : "good"}
          />
        </div>
        <StockAlerts alerts={data.stock.alerts} alertsCount={data.stock.alertsCount} />
      </div>
    );
  }

  const profitTone = data.result.netProfit >= 0 ? "good" : "bad";
  const paymentRows = data.paymentMethodBreakdown.map((r) => ({
    label: PAYMENT_METHOD_LABELS[r.method] ?? r.method,
    value: r.amount,
  }));
  const topProductRows = data.topProducts.map((p) => ({ label: p.name, value: p.amount }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(data.period.from).toLocaleDateString("fr-FR")} —{" "}
            {new Date(data.period.to).toLocaleDateString("fr-FR")} · CA et charges compares sur la
            meme fenetre.
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="CA Net"
          value={formatFcfa(data.revenue.net)}
          icon={Banknote}
          deltaPct={data.revenue.deltaPct}
        />
        <StatCard label="Charges (periode)" value={formatFcfa(data.expenses.total)} icon={Receipt} />
        <StatCard label="Benefice net" value={formatFcfa(data.result.netProfit)} icon={Wallet} tone={profitTone} />
        <StatCard label="Marge nette" value={formatPercent(data.result.marginPct)} icon={TrendingUp} tone={profitTone} />
        <StatCard label="Ticket moyen" value={formatFcfa(data.revenue.avgTicket)} />
        <StatCard label="Nb ventes" value={String(data.revenue.salesCount)} />
        <StatCard label="Valeur stock" value={formatFcfa(data.stock.totalValue)} />
        <StatCard
          label="Alertes stock"
          value={String(data.stock.alertsCount)}
          icon={PackageSearch}
          tone={data.stock.alertsCount > 0 ? "bad" : "good"}
        />
      </div>

      {data.result.monthlyRevenueTarget !== null && (
        <Card>
          <CardContent className="pt-2">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Objectif CA mensuel : <span className="font-figures">{formatFcfa(data.result.monthlyRevenueTarget)}</span>
              </span>
              <span className="font-figures font-medium">{formatPercent(data.result.goalProgressPct)}</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, data.result.goalProgressPct ?? 0))} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Evolution du CA net</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={data.timeSeries} granularity={data.period.granularity} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ventes par categorie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PieBreakdownChart rows={data.revenueByCategory} />
            <CategoryTable rows={data.revenueByCategory} emptyLabel="Aucune vente sur la periode." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Moyens de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart rows={paymentRows} categorical />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 5 articles</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart rows={topProductRows} emptyLabel="Aucune vente sur la periode." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Repartition des charges</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <HorizontalBarChart
            rows={data.expenses.byCategory.map((r) => ({ label: r.category, value: r.amount }))}
            categorical
            emptyLabel="Aucune charge sur la periode."
          />
          <CategoryTable rows={data.expenses.byCategory} emptyLabel="Aucune charge sur la periode." />
        </CardContent>
      </Card>

      <StockAlerts alerts={data.stock.alerts} alertsCount={data.stock.alertsCount} />
    </div>
  );
}
