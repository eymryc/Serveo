"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { KpiCell } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Overview = {
  usersCount: number;
  organizationsCount: number;
  activeOrganizationsCount: number;
  productsCount: number;
  salesThisMonth: number;
  caBrutThisMonth: number;
  chargesThisMonth: number;
  caApresChargesThisMonth: number;
};

type BarRow = {
  id: string;
  name: string;
  city: string | null;
  isActive: number;
  salesCount: number;
  caBrut: number;
  charges: number;
  caApresCharges: number;
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [bars, setBars] = useState<BarRow[]>([]);

  useEffect(() => {
    apiFetch<{ overview: Overview; bars: BarRow[] }>("/api/v1/admin/overview")
      .then((d) => {
        setData(d.overview);
        setBars(d.bars);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur"));
  }, []);

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vue d'ensemble"
        description="Indicateurs globaux — mois en cours"
      />

      <div className="space-y-px border border-border bg-border">
        <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
          <KpiCell label="Utilisateurs" value={String(data.usersCount)} />
          <KpiCell
            label="Bars"
            value={`${data.activeOrganizationsCount}/${data.organizationsCount}`}
          />
          <KpiCell label="Articles" value={String(data.productsCount)} />
          <KpiCell label="Ventes (mois)" value={String(data.salesThisMonth)} />
        </div>
        <div className="grid grid-cols-3 gap-px">
          <KpiCell
            label="CA brut (mois)"
            value={formatFcfa(data.caBrutThisMonth)}
            tone="good"
          />
          <KpiCell
            label="Charges (mois)"
            value={formatFcfa(data.chargesThisMonth)}
          />
          <KpiCell
            label="CA apres charges"
            value={formatFcfa(data.caApresChargesThisMonth)}
            tone={data.caApresChargesThisMonth >= 0 ? "good" : "bad"}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Bars</h2>
            <p className="text-sm text-muted-foreground">
              CA brut et CA apres deduction des charges — mois en cours
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/bars">Tout gerer</Link>
          </Button>
        </div>

        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead className="border-b border-border bg-muted/80">
              <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Bar</th>
                <th className="px-4 py-2.5">Statut</th>
                <th className="px-4 py-2.5 text-right">Ventes</th>
                <th className="px-4 py-2.5 text-right">CA brut</th>
                <th className="px-4 py-2.5 text-right">Charges</th>
                <th className="px-4 py-2.5 text-right">CA apres charges</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-2.5">
                    <p className="font-semibold">{b.name}</p>
                    {b.city && (
                      <p className="text-xs text-muted-foreground">{b.city}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        b.isActive ? "text-success" : "text-destructive"
                      )}
                    >
                      {b.isActive ? "Actif" : "Desactive"}
                    </span>
                  </td>
                  <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                    {b.salesCount}
                  </td>
                  <td className="font-figures px-4 py-2.5 text-right">
                    {formatFcfa(b.caBrut)}
                  </td>
                  <td className="font-figures px-4 py-2.5 text-right text-muted-foreground">
                    {formatFcfa(b.charges)}
                  </td>
                  <td
                    className={cn(
                      "font-figures px-4 py-2.5 text-right font-semibold",
                      b.caApresCharges >= 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {formatFcfa(b.caApresCharges)}
                  </td>
                </tr>
              ))}
              {bars.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucun bar enregistre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href="/admin/users">Voir les utilisateurs</Link>
        </Button>
      </div>
    </div>
  );
}
