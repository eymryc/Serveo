import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { cancelSaleBatch } from "@/lib/sales";

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

    return NextResponse.json({ sales: cancelled }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
