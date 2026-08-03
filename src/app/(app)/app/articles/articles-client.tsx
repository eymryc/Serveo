"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NO_CATEGORY = "none";

type FormState = {
  name: string;
  categoryId: string;
  unitLabel: string;
  packageLabel: string;
  unitsPerPackage: string;
  unitPrice: string;
  purchasePrice: string;
  stockMinThreshold: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  categoryId: NO_CATEGORY,
  unitLabel: "unite",
  packageLabel: "",
  unitsPerPackage: "",
  unitPrice: "",
  purchasePrice: "",
  stockMinThreshold: "5",
};

export default function ArticlesPageClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);

  function loadProducts() {
    apiFetch<{ products: Product[] }>("/api/v1/products?includeInactive=1").then((d) =>
      setProducts(d.products)
    );
  }

  useEffect(loadProducts, []);
  useEffect(() => {
    apiFetch<{ categories: Category[] }>("/api/v1/categories").then((d) => setCategories(d.categories));
  }, []);

  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? "—") : "Sans categorie";

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      categoryId: p.categoryId ?? NO_CATEGORY,
      unitLabel: p.unitLabel,
      packageLabel: p.packageLabel ?? "",
      unitsPerPackage: p.unitsPerPackage ? String(p.unitsPerPackage) : "",
      unitPrice: p.unitPrice,
      purchasePrice: p.purchasePrice ?? "0",
      stockMinThreshold: String(p.stockMinThreshold),
    });
    setSheetOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      categoryId: form.categoryId === NO_CATEGORY ? null : form.categoryId,
      unitLabel: form.unitLabel || "unite",
      packageLabel: form.packageLabel || null,
      unitsPerPackage: form.unitsPerPackage ? Number(form.unitsPerPackage) : null,
      unitPrice: Number(form.unitPrice),
      purchasePrice: Number(form.purchasePrice || 0),
      stockMinThreshold: Number(form.stockMinThreshold || 5),
    };

    try {
      if (editing) {
        await apiFetch(`/api/v1/products/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Article modifie");
      } else {
        await apiFetch("/api/v1/products", { method: "POST", body: JSON.stringify(payload) });
        toast.success(`Article "${form.name}" cree — utilisez Stock pour saisir le stock de depart`);
      }
      setSheetOpen(false);
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(p: Product) {
    try {
      await apiFetch(`/api/v1/products/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: p.isActive ? 0 : 1 }),
      });
      toast.success(p.isActive ? "Article desactive" : "Article reactive");
      setDeactivateTarget(null);
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Articles</h1>
          <p className="text-sm text-muted-foreground">
            Le catalogue de vos produits — Stock et Ventes s&apos;y referent directement.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nouvel article
        </Button>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Unite</TableHead>
                <TableHead>Conditionnement</TableHead>
                <TableHead className="text-right">Prix vente</TableHead>
                <TableHead className="text-right">Prix achat</TableHead>
                <TableHead className="text-right">Seuil alerte</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className={p.isActive ? "" : "opacity-50"}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{categoryName(p.categoryId)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.unitLabel}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.packageLabel && p.unitsPerPackage
                      ? `${p.packageLabel} (${p.unitsPerPackage} ${p.unitLabel}s)`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-figures text-right">{formatFcfa(Number(p.unitPrice))}</TableCell>
                  <TableCell className="font-figures text-right">
                    {formatFcfa(Number(p.purchasePrice ?? 0))}
                  </TableCell>
                  <TableCell className="font-figures text-right text-muted-foreground">
                    {p.stockMinThreshold}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "secondary" : "outline"}>
                      {p.isActive ? "Actif" : "Desactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>Modifier</DropdownMenuItem>
                        <DropdownMenuItem
                          variant={p.isActive ? "destructive" : "default"}
                          onClick={() =>
                            p.isActive ? setDeactivateTarget(p) : handleToggleActive(p)
                          }
                        >
                          {p.isActive ? "Desactiver" : "Reactiver"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Aucun article. Creez le premier ci-dessus.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{editing ? "Modifier l'article" : "Nouvel article"}</SheetTitle>
              <SheetDescription>
                {editing
                  ? "Le stock ne se modifie pas ici — utilisez Stock pour les entrees."
                  : "L'article demarre a 0 en stock — utilisez Stock pour saisir la quantite de depart."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-4">
              <div className="space-y-1.5">
                <Label>Nom de l&apos;article</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label>Categorie</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Sans categorie</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prix de vente (FCFA)</Label>
                  <Input
                    type="number"
                    min={0}
                    required
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prix d&apos;achat (FCFA)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Unite de vente</Label>
                <Input
                  placeholder="bouteille, sachet, verre..."
                  value={form.unitLabel}
                  onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  C&apos;est toujours cette unite qui est vendue et comptee en stock.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Conditionnement d&apos;achat (optionnel)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Casier, Carton..."
                    value={form.packageLabel}
                    onChange={(e) => setForm({ ...form, packageLabel: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Unites / colis (ex: 24)"
                    value={form.unitsPerPackage}
                    onChange={(e) => setForm({ ...form, unitsPerPackage: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ex : &quot;Casier&quot; de 24 bouteilles — permet de saisir les receptions de
                  stock par casier plutot que bouteille par bouteille.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Seuil d&apos;alerte stock (unites)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stockMinThreshold}
                  onChange={(e) => setForm({ ...form, stockMinThreshold: e.target.value })}
                />
              </div>
            </div>

            <SheetFooter>
              <Button type="submit" disabled={submitting}>
                {editing ? "Enregistrer" : "Creer l'article"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactiver {deactivateTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;article disparait de Ventes et Stock mais son historique de ventes est
              conserve. Vous pourrez le reactiver a tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deactivateTarget && handleToggleActive(deactivateTarget)}>
              Desactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
