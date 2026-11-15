"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Organization } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Method = {
  id: string;
  code: string;
  label: string;
  kind: string;
  isActive: boolean;
};

const KIND_LABELS: Record<string, string> = {
  cash: "Especes",
  mobile_money: "Mobile money",
  card_transfer: "Carte / Virement",
  credit: "Credit",
};

export function PaymentMethodsManager({
  organization,
  onUpdated,
}: {
  organization: Organization;
  onUpdated: (org: Organization) => void;
}) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("mobile_money");
  const [adding, setAdding] = useState(false);

  async function reload() {
    const data = await apiFetch<{ methods: Method[] }>("/api/v1/payment-methods");
    setMethods(data.methods);
    onUpdated({
      ...organization,
      activePaymentMethods: data.methods.filter((m) => m.isActive).map((m) => m.code),
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch catalogue au montage
    reload().catch((err) => toast.error(err instanceof Error ? err.message : "Erreur"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- charge une fois a l'ouverture des parametres
  }, []);

  async function toggle(code: string, checked: boolean) {
    setPending(code);
    try {
      await apiFetch("/api/v1/payment-methods", {
        method: "PATCH",
        body: JSON.stringify({ code, isActive: checked ? 1 : 0 }),
      });
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPending(null);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await apiFetch("/api/v1/payment-methods", {
        method: "POST",
        body: JSON.stringify({ label, kind }),
      });
      setLabel("");
      toast.success("Moyen de paiement ajoute");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border border border-border">
        {methods.map((method) => (
          <li key={method.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <Label htmlFor={`pm-${method.code}`} className="font-medium">
                {method.label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {KIND_LABELS[method.kind] ?? method.kind}
                {method.code !== method.label.toLowerCase().replace(/\s+/g, "_")
                  ? ` · ${method.code}`
                  : ""}
              </p>
            </div>
            <Switch
              id={`pm-${method.code}`}
              checked={method.isActive}
              disabled={pending === method.code}
              onCheckedChange={(checked) => toggle(method.code, checked)}
            />
          </li>
        ))}
        {methods.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            Aucun moyen configure.
          </li>
        )}
      </ul>

      <form onSubmit={handleAdd} className="grid gap-3 border border-border p-3 sm:grid-cols-[1fr_10rem_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="pm-new-label">Ajouter (ex. Moov Money)</Label>
          <Input
            id="pm-new-label"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Moov Money"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile_money">Mobile money</SelectItem>
              <SelectItem value="cash">Especes</SelectItem>
              <SelectItem value="card_transfer">Carte / Virement</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={adding} className="self-end">
          {adding ? "Ajout…" : "Ajouter"}
        </Button>
      </form>
    </div>
  );
}
