import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireTenant, tenantErrorResponse } from "@/lib/tenant";
import {
  listOrgPaymentMethods,
  setPaymentMethodActive,
  upsertCustomPaymentMethod,
} from "@/lib/payment-methods";
import { upsertPaymentMethodSchema } from "@/lib/validation";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await requireTenant();
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "1";
    const methods = await listOrgPaymentMethods(organizationId, activeOnly);
    return NextResponse.json({
      methods: methods.map((m) => ({
        id: m.id,
        code: m.code,
        label: m.label,
        kind: m.kind,
        sortOrder: m.sortOrder,
        isActive: m.isActive === 1,
      })),
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

const patchSchema = z.object({
  code: z.string().min(2).max(40),
  isActive: z.coerce.number().int().min(0).max(1),
});

export async function PATCH(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const body = patchSchema.parse(await req.json());
    const updated = await setPaymentMethodActive(organizationId, body.code, body.isActive === 1);
    return NextResponse.json({
      method: {
        id: updated.id,
        code: updated.code,
        label: updated.label,
        kind: updated.kind,
        isActive: updated.isActive === 1,
      },
    });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

// Ajoute (ou reactive) un moyen personnalise — ex. "Moov Money" au Benin.
export async function POST(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    requireAdmin(orgRole);
    const body = upsertPaymentMethodSchema.parse(await req.json());
    const row = await upsertCustomPaymentMethod({
      organizationId,
      code: body.code ?? body.label,
      label: body.label,
      kind: body.kind,
    });
    return NextResponse.json(
      {
        method: {
          id: row.id,
          code: row.code,
          label: row.label,
          kind: row.kind,
          isActive: row.isActive === 1,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
