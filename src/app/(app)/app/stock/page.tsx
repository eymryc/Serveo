"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const NO_CATEGORY = "none";
const ALL_CATEGORIES = "all";

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const [movementQty, setMovementQty] = useState<Record<string, number>>({});
  // Pour un article avec conditionnement (ex: Casier de 24), l'entree peut
  // se saisir en unites ou en colis — converti en unites avant l'envoi.
  const [movementUnit, setMovementUnit] = useState<Record<string, "unit" | "package">>({});

  function loadProducts() {
    apiFetch<{ products: Product[] }>("/api/v1/products").then((d) => setProducts(d.products));
  }

  useEffect(loadProducts, []);
  useEffect(() => {
    apiFetch<{ categories: Category[] }>("/api/v1/categories").then((d) => setCategories(d.categories));
  }, []);

  const categoryName = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? "—") : "Sans categorie";

  const filteredProducts = useMemo(() => {
    if (categoryFilter === ALL_CATEGORIES) return products;
    if (categoryFilter === NO_CATEGORY) return products.filter((p) => !p.categoryId);
    return products.filter((p) => p.categoryId === categoryFilter);
  }, [products, categoryFilter]);

  async function handleEntry(product: Product) {
    const qty = movementQty[product.id];
    if (!qty) return;
    const mode = movementUnit[product.id] ?? "unit";
    const quantityDelta =
      mode === "package" && product.unitsPerPackage ? qty * product.unitsPerPackage : qty;

    try {
      await apiFetch(`/api/v1/products/${product.id}/stock-movements`, {
        method: "POST",
        body: JSON.stringify({ type: "entry", quantityDelta }),
      });
      toast.success(`+${quantityDelta} ${product.unitLabel}(s) en stock`);
      setMovementQty((prev) => ({ ...prev, [product.id]: 0 }));
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stock &amp; approvisionnement</h1>
        <p className="text-sm text-muted-foreground">
          Alertes automatiques par article des que le stock passe sous le seuil minimum. Gerez le
          catalogue (nom, prix, conditionnement) dans Articles.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Articles</CardTitle>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>Toutes les categories</SelectItem>
              <SelectItem value={NO_CATEGORY}>Sans categorie</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead className="text-right">Stock actuel</TableHead>
                <TableHead className="text-right">Seuil min</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Entree de stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => {
                const alert = p.currentStock <= p.stockMinThreshold;
                const hasPackage = !!(p.packageLabel && p.unitsPerPackage);
                const mode = movementUnit[p.id] ?? "unit";
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{categoryName(p.categoryId)}</TableCell>
                    <TableCell className="font-figures text-right">
                      {p.currentStock} <span className="text-muted-foreground">{p.unitLabel}(s)</span>
                    </TableCell>
                    <TableCell className="font-figures text-right text-muted-foreground">
                      {p.stockMinThreshold}
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert ? "destructive" : "secondary"}>
                        {alert ? "Reapprovisionner" : "OK"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          value={movementQty[p.id] ?? ""}
                          onChange={(e) =>
                            setMovementQty((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                          }
                          className="h-8 w-20"
                          placeholder="Qte"
                        />
                        {hasPackage && (
                          <Select
                            value={mode}
                            onValueChange={(v) =>
                              setMovementUnit((prev) => ({ ...prev, [p.id]: v as "unit" | "package" }))
                            }
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unit">{p.unitLabel}(s)</SelectItem>
                              <SelectItem value="package">{p.packageLabel}(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => handleEntry(p)}>
                          <Plus className="size-3.5" /> Entree
                        </Button>
                      </div>
                      {hasPackage && mode === "package" && !!movementQty[p.id] && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          = {movementQty[p.id] * (p.unitsPerPackage ?? 1)} {p.unitLabel}(s)
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucun article. Creez-en depuis la page Articles.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
