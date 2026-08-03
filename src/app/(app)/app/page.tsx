"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa, formatPercent } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

function Card({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${
          tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-neutral-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StockAlerts({ alerts, alertsCount }: { alerts: DashboardData["stock"]["alerts"]; alertsCount: number }) {
  if (alerts.length === 0) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-red-800">
        Articles a reapprovisionner ({alertsCount})
      </h2>
      <ul className="space-y-1 text-sm text-red-900">
        {alerts.map((p) => (
          <li key={p.id} className="flex justify-between">
            <span>{p.name}</span>
            <span>
              Stock {p.currentStock} / seuil {p.stockMinThreshold}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>("/api/v1/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-neutral-500">Chargement...</p>;

  // Vue barman : uniquement le stock, pas les chiffres financiers du bar.
  if (data.restricted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Stock</h1>
          <p className="text-sm text-neutral-500">
            Les chiffres financiers du bar sont reserves au gerant.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card
            label="Alertes stock"
            value={String(data.stock.alertsCount)}
            tone={data.stock.alertsCount > 0 ? "bad" : "good"}
          />
        </div>
        <StockAlerts alerts={data.stock.alerts} alertsCount={data.stock.alertsCount} />
      </div>
    );
  }

  const profitTone = data.result.netProfit >= 0 ? "good" : "bad";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Tableau de bord</h1>
        <p className="text-sm text-neutral-500">
          Periode du {new Date(data.period.from).toLocaleDateString("fr-FR")} au{" "}
          {new Date(data.period.to).toLocaleDateString("fr-FR")} — comparaison CA/charges sur la
          meme fenetre.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="CA Net" value={formatFcfa(data.revenue.net)} />
        <Card label="Charges (periode)" value={formatFcfa(data.expenses.total)} />
        <Card label="Benefice net" value={formatFcfa(data.result.netProfit)} tone={profitTone} />
        <Card label="Marge nette" value={formatPercent(data.result.marginPct)} tone={profitTone} />
        <Card label="Ticket moyen" value={formatFcfa(data.revenue.avgTicket)} />
        <Card label="Nb ventes" value={String(data.revenue.salesCount)} />
        <Card label="Valeur stock" value={formatFcfa(data.stock.totalValue)} />
        <Card
          label="Alertes stock"
          value={String(data.stock.alertsCount)}
          tone={data.stock.alertsCount > 0 ? "bad" : "good"}
        />
      </div>

      {data.result.monthlyRevenueTarget !== null && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-neutral-600">
              Objectif CA mensuel : {formatFcfa(data.result.monthlyRevenueTarget)}
            </span>
            <span className="font-medium text-neutral-900">
              {formatPercent(data.result.goalProgressPct)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.min(100, Math.max(0, data.result.goalProgressPct ?? 0))}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Ventes par categorie</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.revenueByCategory.map((row) => (
                <tr key={row.category} className="border-t border-neutral-100">
                  <td className="py-1.5 text-neutral-700">{row.category}</td>
                  <td className="py-1.5 text-right text-neutral-900">{formatFcfa(row.amount)}</td>
                  <td className="py-1.5 pl-3 text-right text-neutral-500">
                    {formatPercent(row.percentage)}
                  </td>
                </tr>
              ))}
              {data.revenueByCategory.length === 0 && (
                <tr>
                  <td className="py-2 text-neutral-400">Aucune vente sur la periode.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Repartition des charges</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.expenses.byCategory.map((row) => (
                <tr key={row.category} className="border-t border-neutral-100">
                  <td className="py-1.5 text-neutral-700">{row.category}</td>
                  <td className="py-1.5 text-right text-neutral-900">{formatFcfa(row.amount)}</td>
                  <td className="py-1.5 pl-3 text-right text-neutral-500">
                    {formatPercent(row.percentage)}
                  </td>
                </tr>
              ))}
              {data.expenses.byCategory.length === 0 && (
                <tr>
                  <td className="py-2 text-neutral-400">Aucune charge sur la periode.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StockAlerts alerts={data.stock.alerts} alertsCount={data.stock.alertsCount} />
    </div>
  );
}
