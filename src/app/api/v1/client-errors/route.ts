import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { errorResponse } from "@/lib/http-errors";
import { reportError } from "@/lib/error-log";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { clientErrorSchema } from "@/lib/validation";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REPORTS = 20;

// Erreurs JS remontees par le navigateur ou l'app mobile. Publique (un crash
// peut survenir avant la connexion), donc limitee par IP.
export async function POST(req: NextRequest) {
  try {
    const limit = await checkRateLimit(
      `client-errors:ip:${getClientIp(req)}`,
      RATE_LIMIT_MAX_REPORTS,
      RATE_LIMIT_WINDOW_MS
    );
    if (limit.limited) return new NextResponse(null, { status: 204 });

    const body = clientErrorSchema.parse(await req.json());
    const session = await auth().catch(() => null);
    const error = Object.assign(new Error(body.message), { stack: body.stack ?? body.message });

    await reportError(error, {
      source: body.source,
      path: body.path,
      userId: session?.userId ?? null,
      organizationId: session?.orgId ?? null,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
