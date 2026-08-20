"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CategoryManager({ apiPath, placeholder }: { apiPath: string; placeholder: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
      toast.success("Ajoute");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function handleSaveEdit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await apiFetch(`${apiPath}/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim() }),
      });
      setEditingId(null);
      setEditName("");
      load();
      toast.success("Modifie");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await apiFetch(`${apiPath}/${id}`, { method: "DELETE" });
      if (editingId === id) cancelEdit();
      load();
      toast.success("Supprime");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border border border-border">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            {editingId === c.id ? (
              <form onSubmit={handleSaveEdit} className="flex min-w-0 flex-1 items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="h-8"
                  aria-label={`Modifier ${c.name}`}
                />
                <button
                  type="submit"
                  disabled={savingEdit || !editName.trim()}
                  className="flex size-7 shrink-0 items-center justify-center text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                  aria-label="Enregistrer"
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Annuler"
                >
                  <X className="size-3.5" />
                </button>
              </form>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Modifier ${c.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(c.id)}
                    className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Supprimer ${c.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {categories.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            Aucun element pour l&apos;instant.
          </li>
        )}
      </ul>
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
