import "server-only";
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cashSessions, customerPayments, sales } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";

const COUNTABLE_METHODS = [
  "especes",
  "orange_money",
  "mtn_momo",
  "wave",
  "carte_virement",
] as const;

export type CashMethod = (typeof COUNTABLE_METHODS)[number];

export type MethodTotals = Record<CashMethod, number>;

function emptyTotals(): MethodTotals {
  return {
    especes: 0,
    orange_money: 0,
    mtn_momo: 0,
    wave: 0,
    carte_virement: 0,
  };
}

function isCountableMethod(method: string): method is CashMethod {
  return (COUNTABLE_METHODS as readonly string[]).includes(method);
}

export async function getOpenCashSession(organizationId: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(cashSessions)
    .where(and(eq(cashSessions.organizationId, organizationId), eq(cashSessions.status, "open")))
    .limit(1);
  return session ?? null;
}

export async function openCashSession(input: {
  organizationId: string;
  userId: string;
  openingFloat: number;
  openedAt?: Date;
}) {
  const existing = await getOpenCashSession(input.organizationId);
  if (existing) {
    throw new HttpError(409, "Une session de caisse est deja ouverte");
  }

  const openedAt = input.openedAt ?? new Date();
  if (openedAt.getTime() > Date.now() + 60_000) {
    throw new HttpError(400, "La date d'ouverture ne peut pas etre dans le futur");
  }

  const db = getDb();
  const [session] = await db
    .insert(cashSessions)
    .values({
      organizationId: input.organizationId,
      openedByUserId: input.userId,
      openingFloat: input.openingFloat.toString(),
      openedAt,
      status: "open",
    })
    .returning();

  return session;
}

async function computeExpectedByMethod(
  organizationId: string,
  sessionId: string,
  openedAt: Date,
  closedAt: Date | null,
  openingFloat: number
): Promise<MethodTotals> {
  const db = getDb();
  const windowEnd = closedAt ?? new Date();

  const saleRows = await db
    .select({
      paymentMethod: sales.paymentMethod,
      total: sql<string>`coalesce(sum(${sales.netAmount}), 0)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.organizationId, organizationId),
        isNull(sales.cancelledAt),
        or(
          eq(sales.cashSessionId, sessionId),
          and(
            isNull(sales.cashSessionId),
            gte(sales.soldAt, openedAt),
            lte(sales.soldAt, windowEnd)
          )
        )
      )
    )
    .groupBy(sales.paymentMethod);

  const paymentRows = await db
    .select({
      paymentMethod: customerPayments.paymentMethod,
      total: sql<string>`coalesce(sum(${customerPayments.amount}), 0)`,
    })
    .from(customerPayments)
    .where(
      and(
        eq(customerPayments.organizationId, organizationId),
        or(
          eq(customerPayments.cashSessionId, sessionId),
          and(
            isNull(customerPayments.cashSessionId),
            gte(customerPayments.paidAt, openedAt),
            lte(customerPayments.paidAt, windowEnd)
          )
        )
      )
    )
    .groupBy(customerPayments.paymentMethod);

  const expected = emptyTotals();
  // Le fond d'ouverture ne concerne que les especes.
  expected.especes = openingFloat;

  for (const row of saleRows) {
    if (isCountableMethod(row.paymentMethod)) {
      expected[row.paymentMethod] += Number(row.total);
    }
  }
  for (const row of paymentRows) {
    if (isCountableMethod(row.paymentMethod)) {
      expected[row.paymentMethod] += Number(row.total);
    }
  }

  return expected;
}

function countedFromSession(session: typeof cashSessions.$inferSelect): MethodTotals | null {
  if (session.status !== "closed") return null;
  return {
    especes: Number(session.countedEspeces ?? 0),
    orange_money: Number(session.countedOrangeMoney ?? 0),
    mtn_momo: Number(session.countedMtnMomo ?? 0),
    wave: Number(session.countedWave ?? 0),
    carte_virement: Number(session.countedCarteVirement ?? 0),
  };
}

function variances(expected: MethodTotals, counted: MethodTotals): MethodTotals {
  return {
    especes: counted.especes - expected.especes,
    orange_money: counted.orange_money - expected.orange_money,
    mtn_momo: counted.mtn_momo - expected.mtn_momo,
    wave: counted.wave - expected.wave,
    carte_virement: counted.carte_virement - expected.carte_virement,
  };
}

export async function closeCashSession(input: {
  organizationId: string;
  userId: string;
  sessionId: string;
  countedEspeces: number;
  countedOrangeMoney: number;
  countedMtnMomo: number;
  countedWave: number;
  countedCarteVirement: number;
  note?: string;
  closedAt?: Date;
}) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(cashSessions)
    .where(
      and(
        eq(cashSessions.id, input.sessionId),
        eq(cashSessions.organizationId, input.organizationId)
      )
    );

  if (!session) throw new HttpError(404, "Session de caisse introuvable");
  if (session.status !== "open") {
    throw new HttpError(409, "Cette session est deja cloturee");
  }

  const now = new Date();
  const closedAt = input.closedAt ?? now;
  if (closedAt.getTime() > now.getTime() + 60_000) {
    throw new HttpError(400, "La date de cloture ne peut pas etre dans le futur");
  }
  if (closedAt.getTime() < session.openedAt.getTime()) {
    throw new HttpError(400, "La cloture ne peut pas etre avant l'ouverture");
  }

  const expectedByMethod = await computeExpectedByMethod(
    input.organizationId,
    session.id,
    session.openedAt,
    closedAt,
    Number(session.openingFloat)
  );

  const countedByMethod: MethodTotals = {
    especes: input.countedEspeces,
    orange_money: input.countedOrangeMoney,
    mtn_momo: input.countedMtnMomo,
    wave: input.countedWave,
    carte_virement: input.countedCarteVirement,
  };

  const [updated] = await db
    .update(cashSessions)
    .set({
      status: "closed",
      closedAt,
      closedByUserId: input.userId,
      countedEspeces: input.countedEspeces.toString(),
      countedOrangeMoney: input.countedOrangeMoney.toString(),
      countedMtnMomo: input.countedMtnMomo.toString(),
      countedWave: input.countedWave.toString(),
      countedCarteVirement: input.countedCarteVirement.toString(),
      note: input.note?.trim() || null,
    })
    .where(and(eq(cashSessions.id, input.sessionId), eq(cashSessions.status, "open")))
    .returning();

  if (!updated) {
    throw new HttpError(409, "Cette session est deja cloturee");
  }

  return {
    session: updated,
    expectedByMethod,
    countedByMethod,
    variances: variances(expectedByMethod, countedByMethod),
  };
}

export async function listCashSessions(organizationId: string, limit = 30) {
  const db = getDb();
  return db
    .select()
    .from(cashSessions)
    .where(eq(cashSessions.organizationId, organizationId))
    .orderBy(desc(cashSessions.openedAt))
    .limit(limit);
}

export async function getCashSessionSummary(organizationId: string, sessionId: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(cashSessions)
    .where(and(eq(cashSessions.id, sessionId), eq(cashSessions.organizationId, organizationId)));

  if (!session) throw new HttpError(404, "Session de caisse introuvable");

  const expectedByMethod = await computeExpectedByMethod(
    organizationId,
    session.id,
    session.openedAt,
    session.closedAt,
    Number(session.openingFloat)
  );

  const countedByMethod = countedFromSession(session);
  return {
    session,
    expectedByMethod,
    countedByMethod,
    variances: countedByMethod ? variances(expectedByMethod, countedByMethod) : null,
  };
}
