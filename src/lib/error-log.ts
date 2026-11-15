import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { errorLogs } from "@/db/schema";

export type ErrorSource = "api" | "render" | "web" | "mobile";

export type ErrorContext = {
  source: ErrorSource;
  method?: string | null;
  path?: string | null;
  organizationId?: string | null;
  userId?: string | null;
};

const RETENTION_DAYS = 30;
const ALERT_COOLDOWN_MINUTES = 60;
const MAX_STACK_LENGTH = 8000;

function describe(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message || error.name, stack: error.stack ?? null };
  }
  return { message: String(error), stack: null };
}

// Regroupe les occurrences d'un meme bug : message sans les nombres/uuid
// variables + premiere ligne de pile.
export function errorFingerprint(message: string, stack: string | null) {
  const normalized = message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/\d+/g, "<n>");
  const frame = stack?.split("\n").find((l) => l.trim().startsWith("at ")) ?? "";
  return createHash("sha1").update(`${normalized}|${frame.trim()}`).digest("hex").slice(0, 16);
}

async function sendTelegramAlert(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(3000),
  });
}

// Best-effort : ne doit jamais faire echouer la requete qui a deja echoue.
export async function reportError(error: unknown, ctx: ErrorContext) {
  try {
    const { message, stack } = describe(error);
    const fingerprint = errorFingerprint(message, stack);
    const db = getDb();

    const [recent] = await db
      .select({ id: errorLogs.id })
      .from(errorLogs)
      .where(
        and(
          eq(errorLogs.fingerprint, fingerprint),
          gt(errorLogs.createdAt, sql`now() - make_interval(mins => ${ALERT_COOLDOWN_MINUTES})`)
        )
      )
      .limit(1);

    await db.insert(errorLogs).values({
      fingerprint,
      source: ctx.source,
      method: ctx.method ?? null,
      path: ctx.path?.slice(0, 500) ?? null,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, MAX_STACK_LENGTH) ?? null,
      organizationId: ctx.organizationId ?? null,
      userId: ctx.userId ?? null,
    });

    if (!recent) {
      const where = [ctx.method, ctx.path].filter(Boolean).join(" ");
      await sendTelegramAlert(`Serveo — erreur ${ctx.source}${where ? ` (${where})` : ""}\n${message}`);
    }

    if (Math.random() < 0.01) {
      await db
        .delete(errorLogs)
        .where(lt(errorLogs.createdAt, sql`now() - make_interval(days => ${RETENTION_DAYS})`));
    }
  } catch (reportFailure) {
    console.error("Echec enregistrement erreur", reportFailure);
  }
}

// Enregistre une erreur d'API apres l'envoi de la reponse 500.
export function scheduleApiErrorReport(error: unknown) {
  const task = async () => {
    // Import differe : http-errors est importe partout, auth tire next-auth.
    const { auth } = await import("@/lib/auth");
    const session = await auth().catch(() => null);
    await reportError(error, {
      source: "api",
      userId: session?.userId ?? null,
      organizationId: session?.orgId ?? null,
    });
  };
  try {
    after(task);
  } catch {
    // Hors contexte de requete (tests, scripts) : after() n'est pas disponible.
    void task();
  }
}
