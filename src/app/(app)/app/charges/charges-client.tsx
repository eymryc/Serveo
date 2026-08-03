"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatFcfa } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type Expense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify({ expenseDate, label, category, amount, paymentMethod }),
      });
      toast.success("Depense enregistree");
      setLabel("");
      setAmount(0);
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Charges &amp; depenses</h1>
        <p className="text-sm text-muted-foreground">Reserve au gerant.</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label>Libelle</Label>
              <Input required value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Categorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Montant</Label>
              <Input
                type="number"
                min={0}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, lbl]) => (
                    <SelectItem key={value} value={value}>
                      {lbl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={submitting} className="lg:col-span-6">
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Depenses (periode en cours)</CardTitle>
          <span className="font-figures text-sm font-semibold">Total : {formatFcfa(total)}</span>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libelle</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Paiement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="font-figures text-muted-foreground">
                    {new Date(ex.expenseDate).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>{ex.label}</TableCell>
                  <TableCell className="text-muted-foreground">{ex.category}</TableCell>
                  <TableCell className="font-figures text-right font-medium">
                    {formatFcfa(Number(ex.amount))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[ex.paymentMethod] ?? ex.paymentMethod}
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucune charge enregistree sur la periode.
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
