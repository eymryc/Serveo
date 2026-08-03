"use client";

import { useEffect, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function StockPage() {
  const { membership } = useOrganization();
  const isAdmin = membership?.role === "org:admin";

  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({ name, unitPrice, purchasePrice, initialStock, stockMinThreshold }),
      });
      setName("");
      setUnitPrice(0);
      setPurchasePrice(0);
      setInitialStock(0);
      setStockMinThreshold(5);
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEntry(productId: string) {
    const qty = movementQty[productId];
    if (!qty) return;
    setError(null);
    try {
      await apiFetch(`/api/v1/products/${productId}/stock-movements`, {
        method: "POST",
        body: JSON.stringify({ type: "entry", quantityDelta: qty }),
      });
      setMovementQty((prev) => ({ ...prev, [productId]: 0 }));
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Stock &amp; approvisionnement</h1>

      {isAdmin && (
        <form
          onSubmit={handleCreateProduct}
          className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-6"
        >
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de l'article"
            className="col-span-2 rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            min={0}
            required
            value={unitPrice}
            onChange={(e) => setUnitPrice(Number(e.target.value))}
            placeholder="Prix vente"
            className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            min={0}
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(Number(e.target.value))}
            placeholder="Prix achat"
            className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            min={0}
            value={initialStock}
            onChange={(e) => setInitialStock(Number(e.target.value))}
            placeholder="Stock initial"
            className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            min={0}
            value={stockMinThreshold}
            onChange={(e) => setStockMinThreshold(Number(e.target.value))}
            placeholder="Seuil alerte"
            className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="col-span-2 rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 md:col-span-1"
          >
            Ajouter l&apos;article
          </button>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        </form>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="pb-2 font-normal">Article</th>
              <th className="pb-2 font-normal text-right">Stock actuel</th>
              <th className="pb-2 font-normal text-right">Seuil min</th>
              {isAdmin && <th className="pb-2 font-normal text-right">Valeur</th>}
              <th className="pb-2 font-normal">Statut</th>
              <th className="pb-2 font-normal">Entree de stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const alert = p.currentStock <= p.stockMinThreshold;
              return (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="py-1.5 text-neutral-700">{p.name}</td>
                  <td className="py-1.5 text-right text-neutral-900">{p.currentStock}</td>
                  <td className="py-1.5 text-right text-neutral-500">{p.stockMinThreshold}</td>
                  {isAdmin && (
                    <td className="py-1.5 text-right text-neutral-700">
                      {formatFcfa(p.currentStock * Number(p.purchasePrice ?? 0))}
                    </td>
                  )}
                  <td className="py-1.5">
                    {alert ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Reapprovisionner
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        value={movementQty[p.id] ?? ""}
                        onChange={(e) =>
                          setMovementQty((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                        }
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-xs"
                        placeholder="Qte"
                      />
                      <button
                        onClick={() => handleEntry(p.id)}
                        className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                      >
                        + Entree
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td className="py-2 text-neutral-400" colSpan={isAdmin ? 6 : 5}>
                  Aucun article.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
