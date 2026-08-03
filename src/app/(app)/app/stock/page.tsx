"use client";

import { useEffect, useMemo, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { PackagePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const NO_CATEGORY = "none";
const ALL_CATEGORIES = "all";

export default function StockPage() {
  const { membership } = useOrganization();
  const isAdmin = membership?.role === "org:admin";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [unitPrice, setUnitPrice] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [initialStock, setInitialStock] = useState(0);
  const [stockMinThreshold, setStockMinThreshold] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const [movementQty, setMovementQty] = useState<Record<string, number>>({});

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

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          categoryId: categoryId === NO_CATEGORY ? null : categoryId,
          unitPrice,
          purchasePrice,
          initialStock,
          stockMinThreshold,
        }),
      });
      toast.success(`Article "${name}" ajoute`);
      setName("");
      setCategoryId(NO_CATEGORY);
      setUnitPrice(0);
      setPurchasePrice(0);
      setInitialStock(0);
      setStockMinThreshold(5);
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEntry(productId: string) {
    const qty = movementQty[productId];
    if (!qty) return;
    try {
      await apiFetch(`/api/v1/products/${productId}/stock-movements`, {
        method: "POST",
        body: JSON.stringify({ type: "entry", quantityDelta: qty }),
      });
      toast.success(`+${qty} en stock`);
      setMovementQty((prev) => ({ ...prev, [productId]: 0 }));
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
          Alertes automatiques par article des que le stock passe sous le seuil minimum.
        </p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PackagePlus className="size-4" /> Nouvel article
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProduct} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-1.5 lg:col-span-2">
                <Label>Nom de l&apos;article</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Categorie</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
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
              <div className="space-y-1.5">
                <Label>Prix vente</Label>
                <Input
                  type="number"
                  min={0}
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prix achat</Label>
                <Input
                  type="number"
                  min={0}
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock initial</Label>
                <Input
                  type="number"
                  min={0}
                  value={initialStock}
                  onChange={(e) => setInitialStock(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Seuil alerte</Label>
                <Input
                  type="number"
                  min={0}
                  value={stockMinThreshold}
                  onChange={(e) => setStockMinThreshold(Number(e.target.value))}
                />
              </div>
              <Button type="submit" disabled={submitting} className="lg:col-span-6">
                Ajouter l&apos;article
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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
                {isAdmin && <TableHead className="text-right">Valeur</TableHead>}
                <TableHead>Statut</TableHead>
                <TableHead>Entree de stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => {
                const alert = p.currentStock <= p.stockMinThreshold;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{categoryName(p.categoryId)}</TableCell>
                    <TableCell className="font-figures text-right">{p.currentStock}</TableCell>
                    <TableCell className="font-figures text-right text-muted-foreground">
                      {p.stockMinThreshold}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="font-figures text-right">
                        {formatFcfa(p.currentStock * Number(p.purchasePrice ?? 0))}
                      </TableCell>
                    )}
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
                        <Button size="sm" variant="secondary" onClick={() => handleEntry(p.id)}>
                          <Plus className="size-3.5" /> Entree
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground">
                    Aucun article.
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
