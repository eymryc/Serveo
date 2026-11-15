import type { Instrumentation } from "next";

export function register() {}

// Erreurs non interceptees (rendu des pages, server actions). Les routes
// API passent par errorResponse(), qui les enregistre deja.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("@/lib/error-log");
  await reportError(err, {
    source: context.routeType === "route" ? "api" : "render",
    method: request.method,
    path: request.path,
  });
};
