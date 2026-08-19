"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Organization } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManager } from "@/components/category-manager";
import { PaymentMethodsManager } from "@/components/payment-methods-manager";
import { PageHeader } from "@/components/page-header";

export default function ParametresPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ organization: Organization }>("/api/v1/organization")
      .then((d) => setOrg(d.organization))
      .catch((e) => toast.error(e.message));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    try {
      const { organization } = await apiFetch<{ organization: Organization }>("/api/v1/organization", {
        method: "PATCH",
        body: JSON.stringify({
          name: org.name,
          city: org.city,
          country: org.country,
          currency: org.currency,
          monthlyRevenueTarget: org.monthlyRevenueTarget ? Number(org.monthlyRevenueTarget) : undefined,
          defaultStockAlertThreshold: org.defaultStockAlertThreshold,
        }),
      });
      setOrg(organization);
      toast.success("Parametres enregistres");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (!org) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Parametres"
        description="Identite · categories · paiements"
      />

      <Tabs defaultValue="general" className="gap-0">
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0"
        >
          {(
            [
              ["general", "General"],
              ["categories", "Categories"],
              ["paiements", "Paiements"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-none px-4 py-2.5 text-[11px] font-semibold tracking-[0.1em] uppercase"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="mt-0 outline-none">
          <form onSubmit={handleSave} className="border border-t-0 border-border bg-card">
            <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5 md:top-[calc(4rem+env(safe-area-inset-top,0px))]">
              <div className="min-w-0">
                <p className="truncate text-base font-bold tracking-tight">{org.name || "Votre bar"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {org.city ? `${org.city} · ` : ""}Etablissement actif
                </p>
              </div>
              <Button type="submit" disabled={saving} className="shrink-0">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>

            <div className="space-y-6 p-4 sm:p-5">
              <section className="space-y-3">
                <SectionLabel>Identite</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nom du bar">
                    <Input
                      value={org.name}
                      onChange={(e) => setOrg({ ...org, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Ville">
                    <Input
                      value={org.city ?? ""}
                      onChange={(e) => setOrg({ ...org, city: e.target.value })}
                    />
                  </Field>
                </div>
              </section>

              <section className="space-y-3 border-t border-border pt-5">
                <SectionLabel>Objectifs & alertes</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Objectif CA mensuel (FCFA)">
                    <Input
                      type="number"
                      min={0}
                      className="font-figures"
                      value={org.monthlyRevenueTarget ?? ""}
                      onChange={(e) => setOrg({ ...org, monthlyRevenueTarget: e.target.value })}
                    />
                  </Field>
                  <Field label="Seuil d'alerte stock (unites)">
                    <Input
                      type="number"
                      min={0}
                      className="font-figures"
                      value={org.defaultStockAlertThreshold}
                      onChange={(e) =>
                        setOrg({ ...org, defaultStockAlertThreshold: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
              </section>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="categories" className="mt-0 space-y-0 outline-none">
          <div className="border border-t-0 border-border bg-card">
            <SectionBlock
              title="Categories de produits"
              description="Bieres, Vins, Liqueurs… — utilisees dans Stock et Ventes."
            >
              <CategoryManager apiPath="/api/v1/categories" placeholder="Ex: Whisky" />
            </SectionBlock>
            <SectionBlock
              title="Categories de charges"
              description="Loyer, Salaires, Electricite… — utilisees dans Charges."
              bordered
            >
              <CategoryManager apiPath="/api/v1/expense-categories" placeholder="Ex: Assurance" />
            </SectionBlock>
          </div>
        </TabsContent>

        <TabsContent value="paiements" className="mt-0 outline-none">
          <div className="border border-t-0 border-border bg-card">
            <SectionBlock
              title="Moyens de paiement actifs"
              description="Seuls les moyens actifs apparaissent dans Ventes et Charges."
            >
              <PaymentMethodsManager organization={org} onUpdated={setOrg} />
            </SectionBlock>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SectionBlock({
  title,
  description,
  children,
  bordered = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  bordered?: boolean;
}) {
  return (
    <section className={cn("space-y-4 p-4 sm:p-5", bordered && "border-t border-border")}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
