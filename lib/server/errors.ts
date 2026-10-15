import { ZodError } from "zod";
import type { ApiErrorBody, ApiErrorCode, ProgressRowDTO } from "@/lib/api-types";

const STATUS: Record<ApiErrorCode, number> = {
  RATE_LIMITED: 429,
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly status: number;
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly extra: { retryAfter?: number; fields?: Record<string, string>; current?: ProgressRowDTO } = {},
  ) {
    super(message);
    this.status = STATUS[code];
  }
}

export function fieldsFromZod(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) fields[issue.path.join(".") || "body"] ??= issue.message;
  return fields;
}

/** Turn anything thrown by a handler into a JSON error response. Never leaks internals. */
export function toErrorResponse(err: unknown): Response {
  let body: ApiErrorBody;
  let status: number;

  if (err instanceof ApiError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message, ...err.extra } };
  } else if (err instanceof ZodError) {
    status = 400;
    body = { error: { code: "VALIDATION", message: "Invalid request", fields: fieldsFromZod(err) } };
  } else {
    console.error("[api] unexpected error", err);
    status = 500;
    body = { error: { code: "INTERNAL", message: "Something went wrong" } };
  }
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...(err instanceof ApiError && err.extra.retryAfter ? { "Retry-After": String(err.extra.retryAfter) } : {}) } });
}
