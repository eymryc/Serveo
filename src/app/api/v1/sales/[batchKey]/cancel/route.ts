import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { cancelSaleBatch } from "@/lib/sales";
import { recordAudit } from "@/lib/audit";

const bodySchema = z.object({
  reason: z.string().trim().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchKey: string }> }
) {
  try {
    const { organizationId, userId, orgRole } = await requireTenant();
    const { batchKey } = await params;
    const raw = await req.json().catch(() => ({}));
    const body = bodySchema.parse(raw ?? {});

    const cancelled = await cancelSaleBatch({
      organizationId,
      userId,
      batchKey,
      reason: body.reason,
      orgRole,
    });

    await recordAudit({
      organizationId,
      action: "sale.cancel",
      targetType: "sale_batch",
      targetId: batchKey,
      metadata: {
        reason: body.reason ?? null,
        lines: cancelled.length,
        netTotal: cancelled.reduce((sum, s) => sum + Number(s.netAmount), 0),
      },
    });

    return NextResponse.json({ sales: cancelled }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
