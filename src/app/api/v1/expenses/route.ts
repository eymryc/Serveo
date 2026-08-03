import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses } from "@/db/schema";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { createExpenseSchema } from "@/lib/validation";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await requireTenant();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : startOfMonth(new Date());
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
    const db = getDb();

    const rows = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.organizationId, organizationId),
          gte(expenses.expenseDate, from),
          lte(expenses.expenseDate, to)
        )
      )
      .orderBy(expenses.expenseDate);

    return NextResponse.json({ expenses: rows });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, userId } = await requireTenant();
    const body = createExpenseSchema.parse(await req.json());

    const [expense] = await getDb()
      .insert(expenses)
      .values({
        organizationId,
        expenseDate: body.expenseDate,
        label: body.label,
        category: body.category,
        amount: body.amount.toString(),
        paymentMethod: body.paymentMethod,
        frequency: body.frequency,
        remark: body.remark,
        createdByUserId: userId,
      })
      .returning();

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
