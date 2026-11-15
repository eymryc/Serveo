import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  organizationPaymentMethods,
  organizations,
  paymentMethodKindValues,
  paymentMethodValues,
} from "@/db/schema";
import { HttpError } from "@/lib/http-errors";
import { ALLOWED_TIMEZONES } from "@/lib/validation";

export const DEFAULT_PAYMENT_METHOD_CATALOG: {
  code: (typeof paymentMethodValues)[number];
  label: string;
  kind: (typeof paymentMethodKindValues)[number];
  sortOrder: number;
}[] = [
  { code: "especes", label: "Especes", kind: "cash", sortOrder: 0 },
  { code: "orange_money", label: "Orange Money", kind: "mobile_money", sortOrder: 1 },
  { code: "mtn_momo", label: "MTN MoMo", kind: "mobile_money", sortOrder: 2 },
  { code: "wave", label: "Wave", kind: "mobile_money", sortOrder: 3 },
  { code: "carte_virement", label: "Carte / Virement", kind: "card_transfer", sortOrder: 4 },
  { code: "credit_client", label: "Credit client", kind: "credit", sortOrder: 5 },
];

export type AllowedTimezone = (typeof ALLOWED_TIMEZONES)[number];

export function assertAllowedTimezone(timezone: string): asserts timezone is AllowedTimezone {
  if (!(ALLOWED_TIMEZONES as readonly string[]).includes(timezone)) {
    throw new HttpError(400, "Fuseau horaire non supporte");
  }
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function seedDefaultPaymentMethods(
  tx: Tx | ReturnType<typeof getDb>,
  organizationId: string,
  activeCodes: readonly string[] = paymentMethodValues
) {
  await tx.insert(organizationPaymentMethods).values(
    DEFAULT_PAYMENT_METHOD_CATALOG.map((m) => ({
      organizationId,
      code: m.code,
      label: m.label,
      kind: m.kind,
      sortOrder: m.sortOrder,
      isActive: activeCodes.includes(m.code) ? 1 : 0,
    }))
  );
  await syncActivePaymentMethodsCache(tx, organizationId);
}

async function syncActivePaymentMethodsCache(
  tx: Tx | ReturnType<typeof getDb>,
  organizationId: string
) {
  const rows = await tx
    .select({ code: organizationPaymentMethods.code })
    .from(organizationPaymentMethods)
    .where(
      and(
        eq(organizationPaymentMethods.organizationId, organizationId),
        eq(organizationPaymentMethods.isActive, 1)
      )
    )
    .orderBy(asc(organizationPaymentMethods.sortOrder));
  await tx
    .update(organizations)
    .set({ activePaymentMethods: rows.map((r) => r.code) })
    .where(eq(organizations.id, organizationId));
}

export async function listOrgPaymentMethods(organizationId: string, activeOnly = false) {
  const db = getDb();
  return db
    .select()
    .from(organizationPaymentMethods)
    .where(
      and(
        eq(organizationPaymentMethods.organizationId, organizationId),
        activeOnly ? eq(organizationPaymentMethods.isActive, 1) : undefined
      )
    )
    .orderBy(asc(organizationPaymentMethods.sortOrder), asc(organizationPaymentMethods.label));
}

export async function assertPaymentMethodAllowed(
  organizationId: string,
  code: string,
  opts: { allowCredit?: boolean } = {}
) {
  if (code === "credit_client" && opts.allowCredit === false) {
    throw new HttpError(400, "Le credit client n'est pas accepte ici");
  }
  const db = getDb();
  const catalog = await db
    .select({
      code: organizationPaymentMethods.code,
      isActive: organizationPaymentMethods.isActive,
      kind: organizationPaymentMethods.kind,
    })
    .from(organizationPaymentMethods)
    .where(eq(organizationPaymentMethods.organizationId, organizationId));

  // Avant reprise / tests qui creent un bar a la main : accepter le catalogue CI.
  if (catalog.length === 0) {
    if (!(paymentMethodValues as readonly string[]).includes(code)) {
      throw new HttpError(400, "Moyen de paiement inactif ou inconnu pour ce bar");
    }
    return { isActive: 1, kind: DEFAULT_PAYMENT_METHOD_CATALOG.find((m) => m.code === code)?.kind ?? "cash" };
  }

  const row = catalog.find((m) => m.code === code);
  if (!row || row.isActive !== 1) {
    throw new HttpError(400, "Moyen de paiement inactif ou inconnu pour ce bar");
  }
  return row;
}

export async function setPaymentMethodActive(
  organizationId: string,
  code: string,
  isActive: boolean
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(organizationPaymentMethods)
      .set({ isActive: isActive ? 1 : 0 })
      .where(
        and(
          eq(organizationPaymentMethods.organizationId, organizationId),
          eq(organizationPaymentMethods.code, code)
        )
      )
      .returning();
    if (!updated) throw new HttpError(404, "Moyen de paiement introuvable");

    if (!isActive) {
      const stillActive = await tx
        .select({ id: organizationPaymentMethods.id })
        .from(organizationPaymentMethods)
        .where(
          and(
            eq(organizationPaymentMethods.organizationId, organizationId),
            eq(organizationPaymentMethods.isActive, 1)
          )
        )
        .limit(1);
      if (stillActive.length === 0) {
        throw new HttpError(400, "Au moins un moyen de paiement doit rester actif");
      }
    }

    await syncActivePaymentMethodsCache(tx, organizationId);
    return updated;
  });
}

export async function upsertCustomPaymentMethod(input: {
  organizationId: string;
  code: string;
  label: string;
  kind: (typeof paymentMethodKindValues)[number];
}) {
  const code = input.code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (code.length < 2 || code.length > 40) {
    throw new HttpError(400, "Code invalide (2 a 40 caracteres, lettres/chiffres/_)");
  }
  if (code === "credit_client") {
    throw new HttpError(400, "Ce code est reserve");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(organizationPaymentMethods)
      .where(
        and(
          eq(organizationPaymentMethods.organizationId, input.organizationId),
          eq(organizationPaymentMethods.code, code)
        )
      )
      .limit(1);

    let row;
    if (existing) {
      [row] = await tx
        .update(organizationPaymentMethods)
        .set({ label: input.label.trim(), kind: input.kind, isActive: 1 })
        .where(eq(organizationPaymentMethods.id, existing.id))
        .returning();
    } else {
      const existingOrders = await tx
        .select({ sortOrder: organizationPaymentMethods.sortOrder })
        .from(organizationPaymentMethods)
        .where(eq(organizationPaymentMethods.organizationId, input.organizationId));
      const nextOrder = existingOrders.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1;
      [row] = await tx
        .insert(organizationPaymentMethods)
        .values({
          organizationId: input.organizationId,
          code,
          label: input.label.trim(),
          kind: input.kind,
          sortOrder: nextOrder,
          isActive: 1,
        })
        .returning();
    }
    await syncActivePaymentMethodsCache(tx, input.organizationId);
    return row;
  });
}
