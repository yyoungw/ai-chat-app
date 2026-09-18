import { createAppError, type AppError } from "@/lib/errors";

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "status" in error
  );
}

export function jsonError(error: AppError): Response {
  return Response.json(
    { code: error.code, message: error.message },
    { status: error.status >= 400 && error.status < 600 ? error.status : 500 }
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw createAppError("BAD_REQUEST", 400, "JSON 본문이 필요합니다.");
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function asStringRecord(value: unknown): Record<string, string> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === "string" && item.trim()) {
      next[key] = item;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}
