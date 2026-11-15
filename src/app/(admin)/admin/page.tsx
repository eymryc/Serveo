"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AdminEmpty,
  AdminKpi,
  AdminKpiStrip,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminTable,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin-ui";
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
      <div className="space-y-6">
        <Skeleton className="h-24 w-full max-w-lg" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Vue d'ensemble"
        description="Indicateurs globaux de la plateforme — mois en cours."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/bars">Gérer les bars</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/users">Utilisateurs</Link>
            </Button>
          </div>
        }
      />

      <AdminKpiStrip className="grid grid-cols-2 gap-px sm:grid-cols-4">
        <AdminKpi label="Utilisateurs" value={String(data.usersCount)} />
        <AdminKpi
          label="Bars"
          value={`${data.activeOrganizationsCount}/${data.organizationsCount}`}
          hint="Actifs / total"
        />
        <AdminKpi label="Articles" value={String(data.productsCount)} />
        <AdminKpi label="Ventes (mois)" value={String(data.salesThisMonth)} />
      </AdminKpiStrip>

      <AdminKpiStrip className="grid grid-cols-1 gap-px sm:grid-cols-3">
        <AdminKpi
          label="CA brut (mois)"
          value={formatFcfa(data.caBrutThisMonth)}
          tone="good"
        />
        <AdminKpi label="Charges (mois)" value={formatFcfa(data.chargesThisMonth)} />
        <AdminKpi
          label="CA après charges"
          value={formatFcfa(data.caApresChargesThisMonth)}
          tone={data.caApresChargesThisMonth >= 0 ? "good" : "bad"}
        />
      </AdminKpiStrip>

      <AdminPanel
        title="Bars du mois"
        description="CA brut et CA après déduction des charges"
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/bars">Tout gérer</Link>
          </Button>
        }
      >
        <AdminTable minWidth="44rem">
          <AdminTableHead>
            <tr>
              <AdminTh>Bar</AdminTh>
              <AdminTh>Statut</AdminTh>
              <AdminTh align="right">Ventes</AdminTh>
              <AdminTh align="right">CA brut</AdminTh>
              <AdminTh align="right">Charges</AdminTh>
              <AdminTh align="right">CA après charges</AdminTh>
            </tr>
          </AdminTableHead>
          <tbody>
            {bars.map((b) => (
              <AdminTr key={b.id}>
                <AdminTd>
                  <p className="font-semibold tracking-tight">{b.name}</p>
                  {b.city ? (
                    <p className="text-xs text-muted-foreground">{b.city}</p>
                  ) : null}
                </AdminTd>
                <AdminTd>
                  <AdminStatus active={!!b.isActive} />
                </AdminTd>
                <AdminTd align="right" figures muted>
                  {b.salesCount}
                </AdminTd>
                <AdminTd align="right" figures>
                  {formatFcfa(b.caBrut)}
                </AdminTd>
                <AdminTd align="right" figures muted>
                  {formatFcfa(b.charges)}
                </AdminTd>
                <AdminTd
                  align="right"
                  figures
                  className={cn(
                    "font-semibold",
                    b.caApresCharges >= 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {formatFcfa(b.caApresCharges)}
                </AdminTd>
              </AdminTr>
            ))}
            {bars.length === 0 ? (
              <AdminEmpty colSpan={6}>Aucun bar enregistré.</AdminEmpty>
            ) : null}
          </tbody>
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
