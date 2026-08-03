"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type Product, type Sale } from "@/lib/types";
import { enqueueSale, getQueue, syncQueue, type QueuedSale } from "@/lib/offline-sales-queue";

export default function VentesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  // Lecture synchrone au premier rendu (pas dans un effet) : localStorage
  // et navigator.onLine sont deja disponibles au montage cote client.
  const [queue, setQueue] = useState<QueuedSale[]>(() =>
    typeof window === "undefined" ? [] : getQueue()
  );
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [syncing, setSyncing] = useState(false);
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

  const runSync = useCallback(async () => {
    if (getQueue().length === 0) return;
    setSyncing(true);
    try {
      await syncQueue();
      setQueue(getQueue());
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
    // Au cas ou le navigateur revient en ligne sans evenement fiable
    // (frequent sur mobile), on retente periodiquement.
    const interval = setInterval(() => {
      if (navigator.onLine) runSync();
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [runSync]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // Hors-ligne (ou reseau qui vient de tomber) : on met en file locale
    // plutot que de faire echouer la saisie — c'est le scenario terrain
    // le plus critique (vendredi soir, reseau sature).
    if (!navigator.onLine) {
      enqueueSale({ productId, productName: product.name, quantity, discount, paymentMethod });
      setQueue(getQueue());
      setQuantity(1);
      setDiscount(0);
      return;
    }

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
      // Le fetch a echoue reellement (pas juste un refus metier) : on
      // considere qu'on vient de perdre le reseau et on met en file plutot
      // que de perdre la vente.
      enqueueSale({ productId, productName: product.name, quantity, discount, paymentMethod });
      setQueue(getQueue());
      setError(
        err instanceof Error && err.message.startsWith("Erreur")
          ? "Connexion perdue — vente mise en attente, elle sera envoyee automatiquement."
          : err instanceof Error
            ? err.message
            : "Erreur"
      );
      setQuantity(1);
      setDiscount(0);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Ventes du jour</h1>
        {!isOnline && (
          <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
            Hors-ligne — les ventes sont mises en attente
          </span>
        )}
      </div>

      {queue.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <span className="text-amber-800">
            {queue.length} vente{queue.length > 1 ? "s" : ""} en attente de synchronisation
          </span>
          <button
            onClick={runSync}
            disabled={syncing || !isOnline}
            className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
          </button>
        </div>
      )}

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
        {error && <p className="col-span-full text-sm text-amber-700">{error}</p>}
      </form>

      {queue.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">En attente de synchronisation</h2>
          <ul className="space-y-1.5 text-sm">
            {queue.map((q) => (
              <li key={q.localId} className="flex items-center justify-between border-t border-neutral-100 pt-1.5 first:border-t-0 first:pt-0">
                <span className="text-neutral-700">
                  {q.productName} x{q.quantity}
                </span>
                {q.lastError ? (
                  <span className="text-xs text-red-600">{q.lastError}</span>
                ) : (
                  <span className="text-xs text-amber-600">en attente</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
