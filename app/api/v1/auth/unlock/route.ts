import { cookies } from "next/headers";
import { z } from "zod";
import { secureCookies, sessionCookieName } from "@/lib/auth/session";
import { json, parseJson, withApi } from "@/lib/server/http";
import { unlockOwner } from "@/lib/server/services/pin.service";

export const POST = withApi(async (req) => {
  const body = await parseJson(req, z.object({ pin: z.string().regex(/^\d{4}$/, "Enter four digits"), remember: z.boolean().default(false) }).strict(), 1024);
  const session = await unlockOwner(body.pin, body.remember);
  (await cookies()).set(sessionCookieName(), session.token, { httpOnly: true, secure: secureCookies(), sameSite: "strict", path: "/", ...(body.remember ? { maxAge: session.maxAge } : {}) });
  return json({ ok: true });
});
