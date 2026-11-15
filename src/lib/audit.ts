import "server-only";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { auth } from "@/lib/auth";

export type AuditAction =
  | "sale.cancel"
  | "stock.reverse"
  | "inventory.complete"
  | "cash_session.close"
  | "organization.create"
  | "organization.update"
  | "team.create"
  | "team.role_change"
  | "team.remove"
  | "team.password_reset"
  | "admin.user_create"
  | "admin.user_update"
  | "admin.user_delete"
  | "admin.organization_update"
  | "impersonation.start"
  | "impersonation.stop";

type AuditEntry = {
  organizationId: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  /** A fournir quand la session n'est pas lisible (ex. callback jwt de NextAuth). */
  actor?: { userId: string | null; impersonatorUserId?: string | null };
};

// Best-effort : un echec d'ecriture du journal est loggue mais ne doit pas
// annuler l'action metier deja validee (une vente annulee reste annulee).
export async function recordAudit(entry: AuditEntry) {
  try {
    let actor = entry.actor;
    if (!actor) {
      const session = await auth();
      actor = { userId: session.userId, impersonatorUserId: session.impersonatorId };
    }

    await getDb()
      .insert(auditLogs)
      .values({
        organizationId: entry.organizationId,
        actorUserId: actor.userId,
        impersonatorUserId: actor.impersonatorUserId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata,
      });
  } catch (error) {
    console.error("Echec ecriture journal d'audit", entry.action, error);
  }
}
