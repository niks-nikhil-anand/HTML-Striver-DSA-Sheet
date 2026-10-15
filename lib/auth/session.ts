import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isPinHash } from "./pin";

export interface PinConfig { ownerId: string; pinHash: string; secret: string }
export interface SessionPayload { sid: string; uid: string; exp: number }
export function pinConfig(): PinConfig | null {
  const pinHash = process.env.APP_PIN_HASH ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  const ownerId = process.env.OWNER_USER_ID ?? "dev-user";
  return isPinHash(pinHash) && secret.length >= 32 && ownerId.length > 0 ? { ownerId, pinHash, secret } : null;
}
export function localBypass() {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV && !process.env.APP_PIN_HASH && !process.env.SESSION_SECRET && !!process.env.DEV_USER_ID;
}
export function secureCookies() { return process.env.NODE_ENV === "production" || !!process.env.VERCEL_ENV; }
export function sessionCookieName() { return secureCookies() ? "__Host-dsa_session" : "dsa_session"; }
function signature(body: string, config: PinConfig) {
  // Changing either the PIN or signing secret invalidates all previous cookies.
  return createHmac("sha256", config.secret).update(`${config.ownerId}\n${config.pinHash}\n${body}`).digest("base64url");
}
export function newSession(config: PinConfig, remember: boolean, now = Date.now()) {
  const maxAge = remember ? 30 * 24 * 3600 : 12 * 3600;
  const payload: SessionPayload = { sid: randomBytes(32).toString("hex"), uid: config.ownerId, exp: Math.floor(now / 1000) + maxAge };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { payload, token: `${body}.${signature(body, config)}`, maxAge };
}
export function readSession(token: string | undefined, config: PinConfig, now = Date.now()): SessionPayload | null {
  if (!token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signed] = parts;
  const expected = signature(body, config);
  if (!/^[A-Za-z0-9_-]{43}$/.test(signed) || signed.length !== expected.length || !timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    const seconds = Math.floor(now / 1000);
    return data.uid === config.ownerId && typeof data.sid === "string" && /^[a-f0-9]{64}$/.test(data.sid) && Number.isSafeInteger(data.exp) && data.exp > seconds && data.exp <= seconds + 30 * 24 * 3600 ? data : null;
  } catch { return null; }
}
export function sessionId(sid: string) { return createHash("sha256").update(sid).digest("hex"); }
export function safeReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/";
  try { const url = new URL(value, "https://tracker.invalid"); return url.origin === "https://tracker.invalid" && url.pathname !== "/unlock" && !url.pathname.startsWith("/api/") ? `${url.pathname}${url.search}${url.hash}` : "/"; } catch { return "/"; }
}
