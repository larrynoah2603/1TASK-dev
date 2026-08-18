import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Données invalides.", details: error.flatten() }, { status: 422 });
  }
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode?: number }).statusCode) || 500
    : 500;
  const message = error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
  return NextResponse.json({ error: message }, { status: statusCode });
}
