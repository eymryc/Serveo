"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function CategoryManager({ apiPath, placeholder }: { apiPath: string; placeholder: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ categories: Category[] }>(apiPath).then((d) => setCategories(d.categories));
  }

  useEffect(load, [apiPath]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(apiPath, { method: "POST", body: JSON.stringify({ name: name.trim() }) });
      setName("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await apiFetch(`${apiPath}/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <Badge key={c.id} variant="outline" className="gap-1 py-1 pr-1">
            {c.name}
            <button
              type="button"
              onClick={() => handleRemove(c.id)}
              className="ml-0.5 rounded-none p-0.5 hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Supprimer ${c.name}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune categorie pour l&apos;instant.</p>
        )}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="max-w-xs"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={submitting}>
          <Plus className="size-3.5" /> Ajouter
        </Button>
      </form>
    </div>
  );
}
