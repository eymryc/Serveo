"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type Expense } from "@/lib/types";

const CATEGORIES = [
  "Loyer",
  "Salaires",
  "Electricite",
  "Achats boissons",
  "Achats snacks",
  "Telephone",
  "Entretien",
  "Autres",
];

export default function ChargesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("especes");

  function loadExpenses() {
    apiFetch<{ expenses: Expense[] }>("/api/v1/expenses").then((d) => setExpenses(d.expenses.reverse()));
  }

  useEffect(loadExpenses, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify({ expenseDate, label, category, amount, paymentMethod }),
      });
      setLabel("");
      setAmount(0);
      loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Charges &amp; depenses</h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-6"
      >
        <input
          type="date"
          required
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libelle"
          className="col-span-2 rounded border border-neutral-300 px-2 py-1.5 text-sm md:col-span-1"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          required
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="Montant"
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(PAYMENT_METHOD_LABELS).map(([value, lbl]) => (
            <option key={value} value={value}>
              {lbl}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Enregistrer
        </button>
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Depenses (periode en cours)</h2>
          <span className="text-sm font-semibold text-neutral-900">Total : {formatFcfa(total)}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="pb-2 font-normal">Date</th>
              <th className="pb-2 font-normal">Libelle</th>
              <th className="pb-2 font-normal">Categorie</th>
              <th className="pb-2 font-normal text-right">Montant</th>
              <th className="pb-2 font-normal">Paiement</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((ex) => (
              <tr key={ex.id} className="border-t border-neutral-100">
                <td className="py-1.5 text-neutral-700">
                  {new Date(ex.expenseDate).toLocaleDateString("fr-FR")}
                </td>
                <td className="py-1.5 text-neutral-700">{ex.label}</td>
                <td className="py-1.5 text-neutral-500">{ex.category}</td>
                <td className="py-1.5 text-right text-neutral-900">{formatFcfa(Number(ex.amount))}</td>
                <td className="py-1.5 text-neutral-500">
                  {PAYMENT_METHOD_LABELS[ex.paymentMethod] ?? ex.paymentMethod}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td className="py-2 text-neutral-400" colSpan={5}>
                  Aucune charge enregistree sur la periode.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
