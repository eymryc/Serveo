import { NextRequest, NextResponse } from "next/server";
import { desc, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { errorLogs, organizations } from "@/db/schema";
import { requirePlatformAdmin, tenantErrorResponse } from "@/lib/tenant";

const MAX_GROUPS = 100;

// Erreurs des N derniers jours, regroupees par empreinte (meme bug).
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const days = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 7));

    const lastSeen = sql<Date>`max(${errorLogs.createdAt})`;
    const rows = await getDb()
      .select({
        fingerprint: errorLogs.fingerprint,
        occurrences: sql<number>`count(*)::int`,
        usersAffected: sql<number>`count(distinct ${errorLogs.userId})::int`,
        barsAffected: sql<number>`count(distinct ${errorLogs.organizationId})::int`,
        firstSeen: sql<Date>`min(${errorLogs.createdAt})`,
        lastSeen,
        // Derniere occurrence = la plus representative de l'etat actuel du bug.
        latest: sql<{
          source: string;
          method: string | null;
          path: string | null;
          message: string;
          stack: string | null;
          organizationId: string | null;
        }>`(array_agg(json_build_object(
              'source', ${errorLogs.source},
              'method', ${errorLogs.method},
              'path', ${errorLogs.path},
              'message', ${errorLogs.message},
              'stack', ${errorLogs.stack},
              'organizationId', ${errorLogs.organizationId}
            ) ORDER BY ${errorLogs.createdAt} DESC))[1]`,
      })
      .from(errorLogs)
      .where(gt(errorLogs.createdAt, sql`now() - make_interval(days => ${days})`))
      .groupBy(errorLogs.fingerprint)
      .orderBy(desc(lastSeen))
      .limit(MAX_GROUPS);

    const orgIds = [...new Set(rows.map((r) => r.latest.organizationId).filter((id): id is string => !!id))];
    const orgNames = new Map<string, string>();
    if (orgIds.length > 0) {
      const orgs = await getDb()
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(inArray(organizations.id, orgIds));
      for (const o of orgs) orgNames.set(o.id, o.name);
    }

    return NextResponse.json({
      days,
      groups: rows.map((r) => ({
        fingerprint: r.fingerprint,
        occurrences: r.occurrences,
        usersAffected: r.usersAffected,
        barsAffected: r.barsAffected,
        firstSeen: new Date(r.firstSeen).toISOString(),
        lastSeen: new Date(r.lastSeen).toISOString(),
        source: r.latest.source,
        method: r.latest.method,
        path: r.latest.path,
        message: r.latest.message,
        stack: r.latest.stack,
        barName: r.latest.organizationId ? orgNames.get(r.latest.organizationId) ?? null : null,
      })),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
