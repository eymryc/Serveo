"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import {
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
  AdminTable,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin-ui";
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset detail when sheet closes
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
      toast.success(org.isActive ? "Bar désactivé" : "Bar réactivé");
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
      <div className="space-y-6">
        <Skeleton className="h-24 w-full max-w-lg" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Bars"
        description="Tous les établissements de la plateforme — activation et détail."
      />

      <AdminPanel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un bar…"
            className="max-w-sm bg-card"
          />
          <p className="text-xs text-muted-foreground">
            {filtered.length} bar{filtered.length > 1 ? "s" : ""}
          </p>
        </div>

        <AdminTable minWidth="44rem">
          <AdminTableHead>
            <tr>
              <AdminTh>Bar</AdminTh>
              <AdminTh align="right">Membres</AdminTh>
              <AdminTh align="right">Articles</AdminTh>
              <AdminTh align="right">Ventes</AdminTh>
              <AdminTh>Statut</AdminTh>
            </tr>
          </AdminTableHead>
          <tbody>
            {filtered.map((org) => (
              <AdminTr key={org.id} onClick={() => setSelectedId(org.id)}>
                <AdminTd>
                  <p className="font-semibold tracking-tight">{org.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {[org.city, org.country].filter(Boolean).join(" · ") || "—"}
                  </p>
                </AdminTd>
                <AdminTd align="right" figures>
                  {org.membersCount}
                </AdminTd>
                <AdminTd align="right" figures>
                  {org.productsCount}
                </AdminTd>
                <AdminTd align="right" figures>
                  {org.salesCount}
                </AdminTd>
                <AdminTd>
                  <AdminStatus active={!!org.isActive} />
                </AdminTd>
              </AdminTr>
            ))}
            {filtered.length === 0 ? (
              <AdminEmpty colSpan={5}>Aucun bar trouvé.</AdminEmpty>
            ) : null}
          </tbody>
        </AdminTable>
      </AdminPanel>

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          {detail ? (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle>{detail.organization.name}</SheetTitle>
                <SheetDescription>
                  {[detail.organization.city, detail.organization.country]
                    .filter(Boolean)
                    .join(" · ") || "Sans localisation"}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-3 gap-px overflow-hidden border border-border bg-border">
                  {[
                    { label: "Articles", value: String(detail.organization.productsCount) },
                    { label: "Ventes", value: String(detail.organization.salesCount) },
                    {
                      label: "CA total",
                      value: formatFcfa(detail.organization.revenueTotal),
                    },
                  ].map((cell) => (
                    <div key={cell.label} className="space-y-1 bg-card px-3 py-3">
                      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        {cell.label}
                      </p>
                      <p className="font-figures text-sm font-bold tracking-tight">
                        {cell.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <AdminStatus active={!!detail.organization.isActive} />
                  <Button
                    variant={detail.organization.isActive ? "destructive" : "default"}
                    disabled={busy}
                    size="sm"
                    onClick={() => toggleActive(detail.organization)}
                  >
                    {detail.organization.isActive ? "Désactiver" : "Réactiver"}
                  </Button>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Équipe ({detail.members.length})
                  </p>
                  <ul className="divide-y divide-border border border-border">
                    {detail.members.map((m) => (
                      <li key={m.id} className="px-3 py-2.5 text-sm">
                        <p className="font-semibold tracking-tight">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.phone} · {m.role === "admin" ? "Gérant" : m.role === "member" ? "Barman" : m.role}
                          {!m.isActive ? " · désactivé" : ""}
                          {m.isPlatformAdmin ? " · plateforme" : ""}
                        </p>
                      </li>
                    ))}
                    {detail.members.length === 0 ? (
                      <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Aucun membre.
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3 p-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
