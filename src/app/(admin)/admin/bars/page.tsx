"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type OrgRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  isActive: number;
  createdAt: string;
  membersCount: number;
  productsCount: number;
  salesCount: number;
};

type OrgDetail = {
  organization: OrgRow & {
    productsCount: number;
    salesCount: number;
    revenueTotal: number;
  };
  members: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    isActive: number;
    isPlatformAdmin: number;
    createdAt: string;
  }[];
};

export default function AdminBarsPage() {
  const [rows, setRows] = useState<OrgRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<{ organizations: OrgRow[] }>("/api/v1/admin/organizations")
      .then((d) => setRows(d.organizations))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur"));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    apiFetch<OrgDetail>(`/api/v1/admin/organizations/${selectedId}`)
      .then(setDetail)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erreur"));
  }, [selectedId]);

  const filtered = useMemo(() => {
    const list = rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.city ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function toggleActive(org: OrgRow) {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/admin/organizations/${org.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: org.isActive ? 0 : 1 }),
      });
      toast.success(org.isActive ? "Bar desactive" : "Bar reactive");
      load();
      if (selectedId === org.id) {
        const d = await apiFetch<OrgDetail>(`/api/v1/admin/organizations/${org.id}`);
        setDetail(d);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bars" description="Tous les etablissements de la plateforme" />

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un bar…"
        className="max-w-sm"
      />

      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead className="border-b border-border bg-muted/80">
            <tr className="text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              <th className="px-4 py-2.5">Bar</th>
              <th className="px-4 py-2.5">Membres</th>
              <th className="px-4 py-2.5">Articles</th>
              <th className="px-4 py-2.5">Ventes</th>
              <th className="px-4 py-2.5">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((org) => (
              <tr
                key={org.id}
                onClick={() => setSelectedId(org.id)}
                className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/40"
              >
                <td className="px-4 py-2.5">
                  <p className="font-semibold">{org.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {[org.city, org.country].filter(Boolean).join(" · ") || "—"}
                  </p>
                </td>
                <td className="font-figures px-4 py-2.5">{org.membersCount}</td>
                <td className="font-figures px-4 py-2.5">{org.productsCount}</td>
                <td className="font-figures px-4 py-2.5">{org.salesCount}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      org.isActive ? "text-success" : "text-destructive"
                    )}
                  >
                    {org.isActive ? "Actif" : "Desactive"}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Aucun bar trouve.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          {detail && (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle>{detail.organization.name}</SheetTitle>
                <SheetDescription>
                  {[detail.organization.city, detail.organization.country]
                    .filter(Boolean)
                    .join(" · ") || "Sans localisation"}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">Articles</p>
                  <p className="font-figures text-right font-semibold">
                    {detail.organization.productsCount}
                  </p>
                  <p className="text-muted-foreground">Ventes</p>
                  <p className="font-figures text-right font-semibold">
                    {detail.organization.salesCount}
                  </p>
                  <p className="text-muted-foreground">CA total</p>
                  <p className="font-figures text-right font-semibold">
                    {formatFcfa(detail.organization.revenueTotal)}
                  </p>
                </div>

                <Button
                  variant={detail.organization.isActive ? "destructive" : "default"}
                  disabled={busy}
                  onClick={() => toggleActive(detail.organization)}
                  className="w-full"
                >
                  {detail.organization.isActive ? "Desactiver le bar" : "Reactiver le bar"}
                </Button>

                <div>
                  <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Equipe ({detail.members.length})
                  </p>
                  <ul className="divide-y divide-border border border-border">
                    {detail.members.map((m) => (
                      <li key={m.id} className="px-3 py-2.5 text-sm">
                        <p className="font-medium">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.phone} · {m.role}
                          {!m.isActive ? " · desactive" : ""}
                          {m.isPlatformAdmin ? " · plateforme" : ""}
                        </p>
                      </li>
                    ))}
                    {detail.members.length === 0 && (
                      <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Aucun membre.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
