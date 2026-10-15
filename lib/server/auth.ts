import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { localBypass, pinConfig, readSession, sessionCookieName, sessionId } from "@/lib/auth/session";
import { ApiError } from "./errors";
import { db } from "./db";

export interface SessionUser { id: string }
const ensured = new Set<string>();
export async function sessionUser(): Promise<SessionUser | null> {
  await connection();
  const config = pinConfig();
  if (!config) return null;
  const payload = readSession((await cookies()).get(sessionCookieName())?.value, config);
  if (!payload) return null;
  const session = await db.ownerSession.findUnique({ where: { id: sessionId(payload.sid) } });
  return session && session.userId === config.ownerId && session.expiresAt.getTime() > Date.now() ? { id: config.ownerId } : null;
}
/** Every protected API resolves its owner from the verified cookie, never client input. */
export async function requireUser(): Promise<SessionUser> {
  if (localBypass()) {
    const id = process.env.DEV_USER_ID!;
    if (!ensured.has(id)) {
      await db.user.upsert({ where: { id }, create: { id, email: `${id}@dev.local`, name: "Nikhil" }, update: {} });
      ensured.add(id);
    }
    return { id };
  }
  const user = await sessionUser();
  if (!user) throw new ApiError("UNAUTHENTICATED", "Unlock your tracker to continue");
  return user;
}
