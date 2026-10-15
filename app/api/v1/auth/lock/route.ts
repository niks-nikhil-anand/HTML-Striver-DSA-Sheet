import { cookies } from "next/headers";
import { pinConfig, readSession, secureCookies, sessionCookieName, sessionId } from "@/lib/auth/session";
import { db } from "@/lib/server/db";
import { noContent, withApi } from "@/lib/server/http";

export const POST = withApi(async () => {
  const jar = await cookies();
  const config = pinConfig();
  const payload = config && readSession(jar.get(sessionCookieName())?.value, config);
  if (payload) await db.ownerSession.deleteMany({ where: { id: sessionId(payload.sid) } });
  jar.set(sessionCookieName(), "", { httpOnly: true, secure: secureCookies(), sameSite: "strict", path: "/", maxAge: 0 });
  return noContent();
});
