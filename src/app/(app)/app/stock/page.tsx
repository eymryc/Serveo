"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { PackagePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StockPage() {
  const { membership } = useOrganization();
  const isAdmin = membership?.role === "org:admin";

  const [products, setProducts] = useState<Product[]>([]);

  const [name, setName] = useState("");
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

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({ name, unitPrice, purchasePrice, initialStock, stockMinThreshold }),
      });
      toast.success(`Article "${name}" ajoute`);
      setName("");
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead className="text-right">Stock actuel</TableHead>
                <TableHead className="text-right">Seuil min</TableHead>
                {isAdmin && <TableHead className="text-right">Valeur</TableHead>}
                <TableHead>Statut</TableHead>
                <TableHead>Entree de stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const alert = p.currentStock <= p.stockMinThreshold;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
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
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground">
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
