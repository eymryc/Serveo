"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa, formatPercent } from "@/lib/format";
import { DEFAULT_PERIOD_SELECTION, periodSelectionQuery } from "@/lib/dashboard-math";
import { PAYMENT_METHOD_LABELS, type DashboardData, type PeriodSelection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeriodSelector } from "@/components/dashboard/period-selector";
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

function RapportsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function RapportsPageClient() {
  const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD_SELECTION);
  const [tab, setTab] = useState("ventes");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    apiFetch<DashboardData>(`/api/v1/dashboard?${periodSelectionQuery(period)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [period.preset, period.customFrom, period.customTo]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{error}</AlertTitle>
      </Alert>
    );
  }
  if (!data) return <RapportsSkeleton />;

  // Le gerant est deja garanti par la page serveur (redirect sinon) — ce
  // filet ne sert qu'a eviter un crash si l'API renvoie quand meme une vue
  // restreinte (ex. changement de role en cours de session).
  if (data.restricted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rapports" description="Reserve au gerant." />
        <p className="text-sm text-muted-foreground">
          Ces donnees ne sont pas disponibles pour votre role.
        </p>
      </div>
    );
  }

  const profitTone = data.result.netProfit >= 0 ? "good" : "bad";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        description="Analyses détaillées — ventes, charges et stock."
      />

      <PeriodSelector layout="bar" value={period} onChange={setPeriod} />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList variant="line" className="h-10 w-full justify-start gap-0 overflow-x-auto scroll-touch scrollbar-none rounded-none border-b border-border p-0">
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

        <TabsContent value="ventes" className="mt-0 space-y-4 outline-none">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">Ventes par categorie</h2>
              <DataTable
                columns={[
                  { label: "Categorie" },
                  { label: "CA", align: "right" },
                ]}
              >
                {data.revenueByCategory.length === 0 ? (
                  <EmptyRow colSpan={2} label="Aucune vente sur la periode." />
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
              ]}
            >
              {data.paymentMethodBreakdown.length === 0 ? (
                <EmptyRow colSpan={2} label="Aucune vente sur la periode." />
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
                  </tr>
                ))
              )}
            </DataTable>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Articles vendus</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tous les articles avec ventes sur la periode, classes par CA decroissant. Benefice = CA net
                moins cout d&apos;achat (prix d&apos;achat catalogue x quantite vendue).
              </p>
            </div>
            <DataTable
              columns={[
                { label: "Article" },
                { label: "Qte", align: "right" },
                { label: "CA", align: "right" },
                { label: "Benefice", align: "right" },
              ]}
            >
              {data.topProducts.length === 0 ? (
                <EmptyRow colSpan={4} label="Aucune vente sur la periode." />
              ) : (
                data.topProducts.map((p) => (
                  <tr
                    key={p.productId}
                    className="border-b border-border last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                      {p.quantity}
                    </td>
                    <td className="font-figures px-4 py-2.5 text-right font-semibold">
                      {formatFcfa(p.amount)}
                    </td>
                    <td
                      className={cn(
                        "font-figures px-4 py-2.5 text-right font-semibold",
                        p.profit >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {formatFcfa(p.profit)}
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
                  { label: "% du total", align: "right" },
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
