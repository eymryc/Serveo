"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Organization } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Subscription = { status: string; currentPeriodEnd: string | null } | null;

const SUBSCRIPTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Actif", variant: "default" },
  trialing: { label: "Essai", variant: "outline" },
  past_due: { label: "Paiement en retard", variant: "destructive" },
  canceled: { label: "Annule", variant: "secondary" },
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
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const subInfo = subscription ? SUBSCRIPTION_LABELS[subscription.status] : null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Parametres du bar</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="abonnement">Abonnement</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informations generales</CardTitle>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nom du bar</Label>
                  <Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ville</Label>
                  <Input value={org.city ?? ""} onChange={(e) => setOrg({ ...org, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Objectif CA mensuel (FCFA)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={org.monthlyRevenueTarget ?? ""}
                    onChange={(e) => setOrg({ ...org, monthlyRevenueTarget: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Seuil d&apos;alerte stock par defaut (unites)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={org.defaultStockAlertThreshold}
                    onChange={(e) => setOrg({ ...org, defaultStockAlertThreshold: Number(e.target.value) })}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={saving}>
                  Enregistrer
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="abonnement">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Abonnement</CardTitle>
                <CardDescription>
                  Paiement securise via Paystack (carte, mobile money selon disponibilite).
                </CardDescription>
              </div>
              {subInfo && <Badge variant={subInfo.variant}>{subInfo.label}</Badge>}
            </CardHeader>
            <CardFooter>
              <Button onClick={handleSubscribe} disabled={checkingOut}>
                {subscription?.status === "active" ? "Gerer l'abonnement" : "S'abonner"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
