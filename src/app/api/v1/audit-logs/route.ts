import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";

const PAGE_SIZE = 50;

// Journal du bar actif, reserve au gerant. Les actions faites par le
// super-admin en impersonation y apparaissent avec la mention "support",
// sans reveler son identite au bar.
export async function GET(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);

    const before = req.nextUrl.searchParams.get("before");
    const actor = alias(users, "actor");
    const rows = await getDb()
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        viaSupport: auditLogs.impersonatorUserId,
        actorFirstName: actor.firstName,
        actorLastName: actor.lastName,
      })
      .from(auditLogs)
      .leftJoin(actor, eq(actor.id, auditLogs.actorUserId))
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          before ? lt(auditLogs.createdAt, new Date(before)) : undefined
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE);

    return NextResponse.json({
      entries: rows.map((r) => ({
        id: r.id,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
        viaSupport: r.viaSupport !== null,
        actorName: r.actorFirstName ? `${r.actorFirstName} ${r.actorLastName}`.trim() : null,
      })),
      hasMore: rows.length === PAGE_SIZE,
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
