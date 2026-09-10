import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { customerPayments, customers, sales } from "@/db/schema";
import { getOpenCashSession } from "@/lib/cash-sessions";
import { HttpError } from "@/lib/http-errors";

export async function listCustomers(organizationId: string, includeInactive = false) {
  const db = getDb();
  const rows = await db
    .select()
    .from(customers)
    .where(
      includeInactive
        ? eq(customers.organizationId, organizationId)
        : and(eq(customers.organizationId, organizationId), eq(customers.isActive, 1))
    )
    .orderBy(desc(customers.createdAt));

  // Soldes en 2 agrégats (pas N+1) pour la liste.
  const creditRows = await db
    .select({
      customerId: sales.customerId,
      total: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, organizationId),
        eq(sales.paymentMethod, "credit_client"),
        isNull(sales.cancelledAt)
      )
    )
    .groupBy(sales.customerId);

  const paidRows = await db
    .select({
      customerId: customerPayments.customerId,
      total: sql<string>`coalesce(sum(${customerPayments.amount}), 0)`,
    })
    .from(customerPayments)
    .where(eq(customerPayments.organizationId, organizationId))
    .groupBy(customerPayments.customerId);

  const credits = new Map(creditRows.map((r) => [r.customerId, Number(r.total)]));
  const paid = new Map(paidRows.map((r) => [r.customerId, Number(r.total)]));

  return rows.map((c) => ({
    ...c,
    balance: (credits.get(c.id) ?? 0) - (paid.get(c.id) ?? 0),
  }));
}

export async function createCustomer(input: {
  organizationId: string;
  name: string;
  phone?: string | null;
  note?: string | null;
}) {
  const db = getDb();
  const [created] = await db
    .insert(customers)
    .values({
      organizationId: input.organizationId,
      name: input.name,
      phone: input.phone ?? null,
      note: input.note ?? null,
    })
    .returning();
  return created;
}

export type UpdateCustomerInput = Partial<{
  name: string;
  phone: string | null;
  note: string | null;
  isActive: number;
}>;

export async function updateCustomer(
  organizationId: string,
  id: string,
  patch: UpdateCustomerInput
) {
  const db = getDb();
  const [updated] = await db
    .update(customers)
    .set(patch)
    .where(and(eq(customers.id, id), eq(customers.organizationId, organizationId)))
    .returning();

  if (!updated) throw new HttpError(404, "Client introuvable");
  return updated;
}

export async function getCustomer(organizationId: string, customerId: string) {
  const db = getDb();
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)));
  if (!customer) throw new HttpError(404, "Client introuvable");
  return customer;
}

/** Solde = dettes credit actives − remboursements (positif = client doit). */
export async function getCustomerBalance(organizationId: string, customerId: string) {
  await getCustomer(organizationId, customerId);
  const db = getDb();

  const [credit] = await db
    .select({
      total: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, organizationId),
        eq(sales.customerId, customerId),
        eq(sales.paymentMethod, "credit_client"),
        isNull(sales.cancelledAt)
      )
    );

  const [paid] = await db
    .select({
      total: sql<string>`coalesce(sum(${customerPayments.amount}), 0)`,
    })
    .from(customerPayments)
    .where(
      and(
        eq(customerPayments.organizationId, organizationId),
        eq(customerPayments.customerId, customerId)
      )
    );

  return Number(credit?.total ?? 0) - Number(paid?.total ?? 0);
}

export type LedgerEntry =
  | {
      kind: "credit_sale";
      id: string;
      amount: number;
      at: Date;
      paymentMethod: string;
      batchId: string | null;
      note: string | null;
    }
  | {
      kind: "payment";
      id: string;
      amount: number;
      at: Date;
      paymentMethod: string;
      note: string | null;
    };

export async function listCustomerLedger(
  organizationId: string,
  customerId: string,
  limit = 50
): Promise<LedgerEntry[]> {
  await getCustomer(organizationId, customerId);
  const db = getDb();

  const creditSales = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, organizationId),
        eq(sales.customerId, customerId),
        eq(sales.paymentMethod, "credit_client"),
        isNull(sales.cancelledAt)
      )
    )
    .orderBy(desc(sales.soldAt))
    .limit(limit);

  const payments = await db
    .select()
    .from(customerPayments)
    .where(
      and(
        eq(customerPayments.organizationId, organizationId),
        eq(customerPayments.customerId, customerId)
      )
    )
    .orderBy(desc(customerPayments.paidAt))
    .limit(limit);

  const entries: LedgerEntry[] = [
    ...creditSales.map((s) => ({
      kind: "credit_sale" as const,
      id: s.id,
      amount: Number(s.netAmount),
      at: s.soldAt,
      paymentMethod: s.paymentMethod,
      batchId: s.batchId,
      note: null,
    })),
    ...payments.map((p) => ({
      kind: "payment" as const,
      id: p.id,
      amount: Number(p.amount),
      at: p.paidAt,
      paymentMethod: p.paymentMethod,
      note: p.note,
    })),
  ];

  entries.sort((a, b) => b.at.getTime() - a.at.getTime());
  return entries.slice(0, limit);
}

export async function createCustomerPayment(input: {
  organizationId: string;
  userId: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  note?: string | null;
  paidAt?: Date;
}) {
  await getCustomer(input.organizationId, input.customerId);

  if (input.paymentMethod === "credit_client") {
    throw new HttpError(400, "Un remboursement ne peut pas etre en credit client");
  }

  const paidAt = input.paidAt ?? new Date();
  if (paidAt.getTime() > Date.now() + 60_000) {
    throw new HttpError(400, "La date du paiement ne peut pas etre dans le futur");
  }

  const openSession = await getOpenCashSession(input.organizationId);
  const db = getDb();

  const [payment] = await db
    .insert(customerPayments)
    .values({
      organizationId: input.organizationId,
      customerId: input.customerId,
      amount: input.amount.toString(),
      paymentMethod: input.paymentMethod as (typeof customerPayments.$inferInsert)["paymentMethod"],
      note: input.note ?? null,
      paidAt,
      cashSessionId: openSession?.id ?? null,
      createdByUserId: input.userId,
    })
    .returning();

  return payment;
}
