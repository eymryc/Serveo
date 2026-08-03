"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus, RefreshCw, Search, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type Product, type Sale } from "@/lib/types";
import { enqueueSale, getQueue, syncQueue, type QueuedSale } from "@/lib/offline-sales-queue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function VentesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [queue, setQueue] = useState<QueuedSale[]>(() =>
    typeof window === "undefined" ? [] : getQueue()
  );
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("especes");

  function loadAll() {
    apiFetch<{ products: Product[] }>("/api/v1/products").then((d) => setProducts(d.products));
    apiFetch<{ sales: Sale[] }>("/api/v1/sales").then((d) => setSales(d.sales.reverse()));
  }

  const runSync = useCallback(async () => {
    if (getQueue().length === 0) return;
    setSyncing(true);
    try {
      const { synced } = await syncQueue();
      setQueue(getQueue());
      if (synced > 0) toast.success(`${synced} vente(s) synchronisee(s)`);
      loadAll();
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();

    const handleOnline = () => {
      setIsOnline(true);
      runSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const interval = setInterval(() => {
      if (navigator.onLine) runSync();
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [runSync]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const selectedProduct = products.find((p) => p.id === productId);

  function selectProduct(id: string) {
    setProductId(id);
    setQuantity(1);
    setDiscount(0);
  }

  async function handleSubmit() {
    if (!selectedProduct) return;

    if (!navigator.onLine) {
      enqueueSale({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        discount,
        paymentMethod,
      });
      setQueue(getQueue());
      toast.warning("Hors-ligne — vente mise en attente");
      setProductId("");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/v1/sales", {
        method: "POST",
        body: JSON.stringify({ productId: selectedProduct.id, quantity, discount, paymentMethod }),
      });
      toast.success(`Vente enregistree — ${selectedProduct.name} x${quantity}`);
      setProductId("");
      loadAll();
    } catch (err) {
      enqueueSale({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        discount,
        paymentMethod,
      });
      setQueue(getQueue());
      toast.warning(
        err instanceof Error && err.message.startsWith("Erreur")
          ? "Connexion perdue — vente mise en attente"
          : (err instanceof Error ? err.message : "Erreur — vente mise en attente")
      );
      setProductId("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ventes du jour</h1>
          <p className="text-sm text-muted-foreground">Touchez un article pour enregistrer une vente.</p>
        </div>
        {!isOnline && (
          <Badge variant="outline" className="gap-1.5 border-warning/40 text-warning">
            <WifiOff className="size-3.5" />
            Hors-ligne
          </Badge>
        )}
      </div>

      {queue.length > 0 && (
        <Alert className="border-warning/40 text-warning [&>svg]:text-warning">
          <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
          <AlertTitle>
            {queue.length} vente{queue.length > 1 ? "s" : ""} en attente de synchronisation
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3 text-warning/90">
            <span>Envoi automatique des que la connexion revient.</span>
            <Button size="sm" variant="outline" onClick={runSync} disabled={syncing || !isOnline}>
              Synchroniser
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filteredProducts.map((p) => {
              const active = p.id === productId;
              const lowStock = p.currentStock <= p.stockMinThreshold;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProduct(p.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <span className="text-sm font-medium leading-tight">{p.name}</span>
                  <span className="font-figures text-sm text-muted-foreground">
                    {formatFcfa(Number(p.unitPrice))}
                  </span>
                  <Badge variant={lowStock ? "destructive" : "secondary"} className="font-figures text-[10px]">
                    stock {p.currentStock}
                  </Badge>
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                Aucun article ne correspond a la recherche.
              </p>
            )}
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="text-sm">Vente en cours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedProduct ? (
              <p className="text-sm text-muted-foreground">Selectionnez un article dans la liste.</p>
            ) : (
              <>
                <div>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="font-figures text-sm text-muted-foreground">
                    {formatFcfa(Number(selectedProduct.unitPrice))} / unite
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantite</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="font-figures w-8 text-center text-lg font-semibold">{quantity}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8"
                      onClick={() => setQuantity((q) => Math.min(selectedProduct.currentStock, q + 1))}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-sm text-muted-foreground">Remise (FCFA)</span>
                  <Input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-sm text-muted-foreground">Paiement</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={paymentMethod === value ? "default" : "outline"}
                        onClick={() => setPaymentMethod(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-figures text-lg font-semibold">
                    {formatFcfa(Number(selectedProduct.unitPrice) * quantity - discount)}
                  </span>
                </div>

                <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
                  Enregistrer la vente
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Historique (periode en cours)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Article</TableHead>
                <TableHead className="text-right">Qte</TableHead>
                <TableHead className="text-right">CA Net</TableHead>
                <TableHead>Paiement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => {
                const product = products.find((p) => p.id === s.productId);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-figures text-muted-foreground">
                      {new Date(s.soldAt).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell>{product?.name ?? "—"}</TableCell>
                    <TableCell className="font-figures text-right">{s.quantity}</TableCell>
                    <TableCell className="font-figures text-right font-medium">
                      {formatFcfa(Number(s.netAmount))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}
                    </TableCell>
                  </TableRow>
                );
              })}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucune vente enregistree sur la periode.
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
