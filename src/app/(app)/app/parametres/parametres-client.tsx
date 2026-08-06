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

type Subscription = { status: string; currentPeriodEnd: string | null } | null;

const SUBSCRIPTION_LABELS: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "muted" }> = {
  active: { label: "Actif", tone: "ok" },
  trialing: { label: "Essai", tone: "warn" },
  past_due: { label: "Paiement en retard", tone: "bad" },
  canceled: { label: "Annule", tone: "muted" },
};

export default function ParametresPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [saving, setSaving] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    apiFetch<{ organization: Organization; subscription: Subscription }>("/api/v1/organization")
      .then((d) => {
        setOrg(d.organization);
        setSubscription(d.subscription);
      })
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

  async function handleSubscribe() {
    setCheckingOut(true);
    try {
      const { authorizationUrl } = await apiFetch<{ authorizationUrl: string }>(
        "/api/v1/billing/checkout",
        { method: "POST" }
      );
      window.location.href = authorizationUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setCheckingOut(false);
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

  const subInfo = subscription ? SUBSCRIPTION_LABELS[subscription.status] : null;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Parametres"
        description="Identite · categories · paiements · abonnement"
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
              ["abonnement", "Abonnement"],
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
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
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

        <TabsContent value="abonnement" className="mt-0 outline-none">
          <div className="border border-t-0 border-border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-base font-bold tracking-tight">Abonnement</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Paiement securise via Paystack (carte, mobile money selon disponibilite).
                </p>
              </div>
              {subInfo && (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    subInfo.tone === "ok" && "text-success",
                    subInfo.tone === "warn" && "text-warning",
                    subInfo.tone === "bad" && "text-destructive",
                    subInfo.tone === "muted" && "text-muted-foreground"
                  )}
                >
                  {subInfo.label}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <p className="font-figures text-xs text-muted-foreground">
                {subscription?.currentPeriodEnd
                  ? `Periode jusqu'au ${new Date(subscription.currentPeriodEnd).toLocaleDateString("fr-FR")}`
                  : "Aucun abonnement actif"}
              </p>
              <Button onClick={handleSubscribe} disabled={checkingOut}>
                {checkingOut
                  ? "Redirection…"
                  : subscription?.status === "active"
                    ? "Gerer l'abonnement"
                    : "S'abonner"}
              </Button>
            </div>
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
