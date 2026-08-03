"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { ALL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type Organization } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function PaymentMethodsManager({
  organization,
  onUpdated,
}: {
  organization: Organization;
  onUpdated: (org: Organization) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(method: string, checked: boolean) {
    const current = organization.activePaymentMethods;
    const next = checked ? [...current, method] : current.filter((m) => m !== method);

    if (next.length === 0) {
      toast.error("Au moins un moyen de paiement doit rester actif");
      return;
    }

    setPending(method);
    try {
      const { organization: updated } = await apiFetch<{ organization: Organization }>(
        "/api/v1/organization",
        { method: "PATCH", body: JSON.stringify({ activePaymentMethods: next }) }
      );
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {ALL_PAYMENT_METHODS.map((method) => {
        const active = organization.activePaymentMethods.includes(method);
        return (
          <div key={method} className="flex items-center justify-between">
            <Label htmlFor={`pm-${method}`} className="font-normal">
              {PAYMENT_METHOD_LABELS[method]}
            </Label>
            <Switch
              id={`pm-${method}`}
              checked={active}
              disabled={pending === method}
              onCheckedChange={(checked) => toggle(method, checked)}
            />
          </div>
        );
      })}
    </div>
  );
}
