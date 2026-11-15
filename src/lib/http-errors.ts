import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { scheduleApiErrorReport } from "@/lib/error-log";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Donnees invalides", details: error.issues },
      { status: 400 }
    );
  }
  console.error(error);
  scheduleApiErrorReport(error);
  return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
}
