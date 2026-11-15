import "server-only";
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cashSessions, customerPayments, organizationPaymentMethods, sales } from "@/db/schema";
import { HttpError } from "@/lib/http-errors";

export type MethodTotals = Record<string, number>;

const LEGACY_COUNT_KEYS = [
  "especes",
  "orange_money",
  "mtn_momo",
  "wave",
  "carte_virement",
] as const;

async function countableCodes(organizationId: string) {
  const db = getDb();
  const rows = await db
    .select({
      code: organizationPaymentMethods.code,
      kind: organizationPaymentMethods.kind,
    })
    .from(organizationPaymentMethods)
    .where(
      and(
        eq(organizationPaymentMethods.organizationId, organizationId),
        eq(organizationPaymentMethods.isActive, 1)
      )
    );
  // Le credit client n'est pas "compte" en caisse (dette, pas d'argent recu).
  const codes = rows.filter((r) => r.kind !== "credit").map((r) => r.code);
  return codes.length > 0 ? codes : [...LEGACY_COUNT_KEYS];
}

function emptyTotals(codes: string[]): MethodTotals {
  return Object.fromEntries(codes.map((c) => [c, 0]));
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
  openingFloat: number,
  codes: string[]
): Promise<MethodTotals> {
  const db = getDb();
  const windowEnd = closedAt ?? new Date();
  const codeSet = new Set(codes);

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
          and(isNull(sales.cashSessionId), gte(sales.soldAt, openedAt), lte(sales.soldAt, windowEnd))
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

  const expected = emptyTotals(codes);
  if (codes.includes("especes")) expected.especes = openingFloat;

  for (const row of saleRows) {
    if (codeSet.has(row.paymentMethod)) expected[row.paymentMethod] += Number(row.total);
  }
  for (const row of paymentRows) {
    if (codeSet.has(row.paymentMethod)) expected[row.paymentMethod] += Number(row.total);
  }

  return expected;
}

function countedFromSession(
  session: typeof cashSessions.$inferSelect,
  codes: string[]
): MethodTotals | null {
  if (session.status !== "closed") return null;
  if (session.countedByMethod) {
    const out = emptyTotals(codes);
    for (const code of codes) {
      out[code] = Number(session.countedByMethod[code] ?? 0);
    }
    return out;
  }
  // Fallback legacy (sessions cloturees avant la migration JSON).
  return {
    especes: Number(session.countedEspeces ?? 0),
    orange_money: Number(session.countedOrangeMoney ?? 0),
    mtn_momo: Number(session.countedMtnMomo ?? 0),
    wave: Number(session.countedWave ?? 0),
    carte_virement: Number(session.countedCarteVirement ?? 0),
  };
}

function variances(expected: MethodTotals, counted: MethodTotals): MethodTotals {
  const keys = new Set([...Object.keys(expected), ...Object.keys(counted)]);
  const out: MethodTotals = {};
  for (const key of keys) out[key] = (counted[key] ?? 0) - (expected[key] ?? 0);
  return out;
}

function normalizeCountedInput(
  input: {
    countedByMethod?: Record<string, number>;
    countedEspeces?: number;
    countedOrangeMoney?: number;
    countedMtnMomo?: number;
    countedWave?: number;
    countedCarteVirement?: number;
  },
  codes: string[]
): MethodTotals {
  if (input.countedByMethod) {
    const out = emptyTotals(codes);
    for (const code of codes) out[code] = Number(input.countedByMethod[code] ?? 0);
    return out;
  }
  const legacy: MethodTotals = {
    especes: input.countedEspeces ?? 0,
    orange_money: input.countedOrangeMoney ?? 0,
    mtn_momo: input.countedMtnMomo ?? 0,
    wave: input.countedWave ?? 0,
    carte_virement: input.countedCarteVirement ?? 0,
  };
  const out = emptyTotals(codes);
  for (const code of codes) out[code] = Number(legacy[code] ?? 0);
  return out;
}

export async function closeCashSession(input: {
  organizationId: string;
  userId: string;
  sessionId: string;
  countedByMethod?: Record<string, number>;
  countedEspeces?: number;
  countedOrangeMoney?: number;
  countedMtnMomo?: number;
  countedWave?: number;
  countedCarteVirement?: number;
  note?: string;
  closedAt?: Date;
}) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(cashSessions)
    .where(
      and(eq(cashSessions.id, input.sessionId), eq(cashSessions.organizationId, input.organizationId))
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

  const codes = await countableCodes(input.organizationId);
  const expectedByMethod = await computeExpectedByMethod(
    input.organizationId,
    session.id,
    session.openedAt,
    closedAt,
    Number(session.openingFloat),
    codes
  );
  const countedByMethod = normalizeCountedInput(input, codes);
  const countedJson = Object.fromEntries(
    Object.entries(countedByMethod).map(([k, v]) => [k, v.toString()])
  );

  const [updated] = await db
    .update(cashSessions)
    .set({
      status: "closed",
      closedAt,
      closedByUserId: input.userId,
      countedByMethod: countedJson,
      // Miroir legacy pour les lecteurs anciens.
      countedEspeces: (countedByMethod.especes ?? 0).toString(),
      countedOrangeMoney: (countedByMethod.orange_money ?? 0).toString(),
      countedMtnMomo: (countedByMethod.mtn_momo ?? 0).toString(),
      countedWave: (countedByMethod.wave ?? 0).toString(),
      countedCarteVirement: (countedByMethod.carte_virement ?? 0).toString(),
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

  const codes = await countableCodes(organizationId);
  const expectedByMethod = await computeExpectedByMethod(
    organizationId,
    session.id,
    session.openedAt,
    session.closedAt,
    Number(session.openingFloat),
    codes
  );
  const countedByMethod = countedFromSession(session, codes);

  return {
    session,
    expectedByMethod,
    countedByMethod,
    variances: countedByMethod ? variances(expectedByMethod, countedByMethod) : null,
    countableMethods: codes,
    legacyKeys: LEGACY_COUNT_KEYS,
  };
}
