import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { requireTenant, tenantErrorResponse } from "@/lib/tenant";
import { initializeTransaction } from "@/lib/paystack";

const MONTHLY_PLAN_AMOUNT_FCFA = Number(process.env.PAYSTACK_MONTHLY_AMOUNT_FCFA ?? 10000);

export async function POST(req: NextRequest) {
  try {
    const { organizationId, orgRole } = await requireTenant();
    if (orgRole !== "org:admin") {
      return NextResponse.json({ error: "Seul le gerant peut gerer l'abonnement" }, { status: 403 });
    }

    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "Email introuvable sur le compte" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const { authorization_url } = await initializeTransaction({
      email,
      amountFcfa: MONTHLY_PLAN_AMOUNT_FCFA,
      planCode: process.env.PAYSTACK_PLAN_CODE,
      organizationId,
      callbackUrl: `${origin}/app/parametres?billing=success`,
    });

    return NextResponse.json({ authorizationUrl: authorization_url });
  } catch (error) {
    return tenantErrorResponse(error);
  }
}
