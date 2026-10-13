import "server-only";
import { ApiError } from "./errors";
import { db } from "./db";

export interface SessionUser {
  id: string;
}

const ensured = new Set<string>();

/**
 * The ONLY way handlers learn who the caller is. The id always comes from a verified
 * session, never from the request body.
 *
 * Interim implementation (development only): treats the machine as one user, `DEV_USER_ID`.
 * It refuses to run in production/Vercel, so it can never ship as an open door.
 * Phase 2 replaces this function body with the chosen auth library's session lookup;
 * no handler changes.
 */
export async function requireUser(): Promise<SessionUser> {
  const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL_ENV;
  const id = process.env.DEV_USER_ID;
  if (isProd || !id) {
    throw new ApiError("UNAUTHENTICATED", isProd ? "Sign in required" : "Sign in required (set DEV_USER_ID for local development)");
  }
  if (!ensured.has(id)) {
    await db.user.upsert({ where: { id }, create: { id, email: `${id}@dev.local`, name: "Dev user" }, update: {} });
    ensured.add(id);
  }
  return { id };
}
