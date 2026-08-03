import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, subscriptions } from "@/db/schema";

// Paystack signe chaque webhook avec un HMAC SHA512 du corps brut, calcule
// avec la cle secrete. Il faut lire le body en texte AVANT de le parser
// pour que la verification porte sur les octets exacts envoyes.
function isValidSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const db = getDb();

  switch (event.event) {
    case "charge.success": {
      const organizationId = event.data?.metadata?.organizationId;
      if (!organizationId) break;

      await db
        .update(organizations)
        .set({ paystackCustomerCode: event.data.customer?.customer_code })
        .where(eq(organizations.id, organizationId));

      await db
        .insert(subscriptions)
        .values({
          organizationId,
          planCode: event.data.plan?.plan_code ?? "default",
          status: "active",
        })
        .onConflictDoUpdate({
          target: subscriptions.organizationId,
          set: { status: "active", updatedAt: new Date() },
        });
      break;
    }
    case "subscription.create": {
      const organizationId = event.data?.metadata?.organizationId;
      if (!organizationId) break;

      await db
        .update(subscriptions)
        .set({
          paystackSubscriptionCode: event.data.subscription_code,
          status: "active",
          currentPeriodEnd: event.data.next_payment_date
            ? new Date(event.data.next_payment_date)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.organizationId, organizationId));
      break;
    }
    case "subscription.disable":
    case "subscription.not_renew": {
      const code = event.data?.subscription_code;
      if (!code) break;
      await db
        .update(subscriptions)
        .set({ status: "canceled", updatedAt: new Date() })
        .where(eq(subscriptions.paystackSubscriptionCode, code));
      break;
    }
    case "invoice.payment_failed": {
      const code = event.data?.subscription?.subscription_code;
      if (!code) break;
      await db
        .update(subscriptions)
        .set({ status: "past_due", updatedAt: new Date() })
        .where(eq(subscriptions.paystackSubscriptionCode, code));
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
