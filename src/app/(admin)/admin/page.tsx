"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
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
  revenueThisMonth: number;
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    apiFetch<{ overview: Overview }>("/api/v1/admin/overview")
      .then((d) => setData(d.overview))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur"));
  }, []);

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vue d'ensemble"
        description="Indicateurs globaux de la plateforme Serveo"
      />

      <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
        <KpiCell label="Utilisateurs" value={String(data.usersCount)} />
        <KpiCell
          label="Bars"
          value={`${data.activeOrganizationsCount}/${data.organizationsCount}`}
        />
        <KpiCell label="Articles" value={String(data.productsCount)} />
        <KpiCell label="Ventes (mois)" value={String(data.salesThisMonth)} />
        <KpiCell
          label="CA (mois)"
          value={formatFcfa(data.revenueThisMonth)}
          tone="good"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href="/admin/bars">Voir les bars</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin/users">Voir les utilisateurs</Link>
        </Button>
      </div>
    </div>
  );
}
