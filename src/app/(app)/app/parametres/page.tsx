"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Organization } from "@/lib/types";

type Subscription = { status: string; currentPeriodEnd: string | null } | null;

const SUBSCRIPTION_LABELS: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-emerald-100 text-emerald-700" },
  trialing: { label: "Essai", className: "bg-amber-100 text-amber-700" },
  past_due: { label: "Paiement en retard", className: "bg-red-100 text-red-700" },
  canceled: { label: "Annule", className: "bg-neutral-100 text-neutral-600" },
};

export default function ParametresPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    apiFetch<{ organization: Organization; subscription: Subscription }>("/api/v1/organization")
      .then((d) => {
        setOrg(d.organization);
        setSubscription(d.subscription);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubscribe() {
    setError(null);
    setCheckingOut(true);
    try {
      const { authorizationUrl } = await apiFetch<{ authorizationUrl: string }>(
        "/api/v1/billing/checkout",
        { method: "POST" }
      );
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setCheckingOut(false);
    }
  }

  if (!org) return <p className="text-neutral-500">Chargement...</p>;

  const subInfo = subscription ? SUBSCRIPTION_LABELS[subscription.status] : null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Parametres du bar</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Abonnement</h2>
          {subInfo && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${subInfo.className}`}>
              {subInfo.label}
            </span>
          )}
        </div>
        <p className="mb-3 text-sm text-neutral-500">
          Paiement securise via Paystack (carte, mobile money selon disponibilite).
        </p>
        <button
          onClick={handleSubscribe}
          disabled={checkingOut}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {subscription?.status === "active" ? "Gerer l'abonnement" : "S'abonner"}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Informations generales</h2>
        <label className="block text-sm">
          <span className="text-neutral-600">Nom du bar</span>
          <input
            value={org.name}
            onChange={(e) => setOrg({ ...org, name: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600">Ville</span>
          <input
            value={org.city ?? ""}
            onChange={(e) => setOrg({ ...org, city: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600">Objectif CA mensuel (FCFA)</span>
          <input
            type="number"
            min={0}
            value={org.monthlyRevenueTarget ?? ""}
            onChange={(e) => setOrg({ ...org, monthlyRevenueTarget: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-neutral-600">Seuil d&apos;alerte stock par defaut (unites)</span>
          <input
            type="number"
            min={0}
            value={org.defaultStockAlertThreshold}
            onChange={(e) =>
              setOrg({ ...org, defaultStockAlertThreshold: Number(e.target.value) })
            }
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Enregistrer
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
