"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type Product, type Sale } from "@/lib/types";

export default function VentesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("especes");

  function loadAll() {
    apiFetch<{ products: Product[] }>("/api/v1/products").then((d) => setProducts(d.products));
    apiFetch<{ sales: Sale[] }>("/api/v1/sales").then((d) => setSales(d.sales.reverse()));
  }

  useEffect(loadAll, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/sales", {
        method: "POST",
        body: JSON.stringify({ productId, quantity, discount, paymentMethod }),
      });
      setQuantity(1);
      setDiscount(0);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Ventes du jour</h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-5"
      >
        <select
          required
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="col-span-2 rounded border border-neutral-300 px-2 py-1.5 text-sm md:col-span-1"
        >
          <option value="">Article...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatFcfa(Number(p.unitPrice))} (stock {p.currentStock})
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          required
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          placeholder="Qte"
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min={0}
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))}
          placeholder="Remise (FCFA)"
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting || !productId}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Enregistrer la vente
        </button>
        {selectedProduct && (
          <p className="col-span-full text-xs text-neutral-500">
            Total brut estime : {formatFcfa(Number(selectedProduct.unitPrice) * quantity - discount)}
          </p>
        )}
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Historique (periode en cours)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="pb-2 font-normal">Date</th>
              <th className="pb-2 font-normal">Article</th>
              <th className="pb-2 font-normal text-right">Qte</th>
              <th className="pb-2 font-normal text-right">CA Net</th>
              <th className="pb-2 font-normal">Paiement</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => {
              const product = products.find((p) => p.id === s.productId);
              return (
                <tr key={s.id} className="border-t border-neutral-100">
                  <td className="py-1.5 text-neutral-700">
                    {new Date(s.soldAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="py-1.5 text-neutral-700">{product?.name ?? "—"}</td>
                  <td className="py-1.5 text-right text-neutral-700">{s.quantity}</td>
                  <td className="py-1.5 text-right text-neutral-900">
                    {formatFcfa(Number(s.netAmount))}
                  </td>
                  <td className="py-1.5 text-neutral-500">
                    {PAYMENT_METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}
                  </td>
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr>
                <td className="py-2 text-neutral-400" colSpan={5}>
                  Aucune vente enregistree sur la periode.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
