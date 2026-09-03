import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ErrorWithStatus = Error & { statusCode: number };
type PrismaError = Error & { code: string };

function hasValidStatusCode(error: unknown): error is ErrorWithStatus {
  if (!(error instanceof Error) || !("statusCode" in error)) return false;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number"
    && Number.isInteger(statusCode)
    && statusCode >= 400
    && statusCode <= 599;
}

function isPrismaError(error: unknown): error is PrismaError {
  return error instanceof Error
    && "code" in error
    && typeof (error as { code?: unknown }).code === "string";
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Données invalides.", details: error.flatten() }, { status: 422 });
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (hasValidStatusCode(error)) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (isPrismaError(error)) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Cette ressource existe déjà." }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
    }
  }

  console.error("Unhandled API error", error);
  return NextResponse.json({ error: "Une erreur inattendue est survenue." }, { status: 500 });
}
