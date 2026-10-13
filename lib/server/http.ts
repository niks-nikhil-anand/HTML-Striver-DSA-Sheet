import { connection } from "next/server";
import type { ZodType } from "zod";
import { ApiError, toErrorResponse } from "./errors";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, { ...init, headers: { ...NO_STORE, ...init.headers } });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}

/** Reject cross-site mutations. Browsers always send Origin on non-GET fetches. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (curl, tests) don't send one
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host || new URL(origin).host !== host) throw new ApiError("FORBIDDEN", "Cross-origin request blocked");
}

export async function parseJson<T>(req: Request, schema: ZodType<T>, maxBytes = 64 * 1024): Promise<T> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new ApiError("PAYLOAD_TOO_LARGE", "Request body too large");
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError("PAYLOAD_TOO_LARGE", "Request body too large");
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError("VALIDATION", "Body must be valid JSON");
  }
  return schema.parse(raw);
}

/** Wraps a handler: marks the route dynamic, enforces same-origin on mutations, formats errors. */
export function withApi<A extends unknown[]>(handler: (req: Request, ...args: A) => Promise<Response>) {
  return async (req: Request, ...args: A): Promise<Response> => {
    // Outside the try on purpose: during `next build` this rejects as a signal Next must handle itself.
    await connection(); // request-time only: never prerendered under Cache Components
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await handler(req, ...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
