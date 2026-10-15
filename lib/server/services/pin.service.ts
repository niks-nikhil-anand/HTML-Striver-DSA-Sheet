import "server-only";
import { verifyPin } from "@/lib/auth/pin";
import { newSession, pinConfig, sessionId } from "@/lib/auth/session";
import { ApiError } from "../errors";
import { db } from "../db";

/** Persistent owner-level throttle survives restarts and rotating client IPs. */
export async function unlockOwner(pin: string, remember: boolean, now = new Date()) {
  const config = pinConfig();
  if (!config) throw new ApiError("INTERNAL", "PIN access is not configured. Run the PIN setup command and configure the server environment.");
  const key = `owner:${config.ownerId}`;
  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`INSERT INTO "PinAttempt" ("key", "failures", "lockouts", "updatedAt") VALUES (${key}, 0, 0, ${now}) ON CONFLICT ("key") DO NOTHING`;
    await tx.$queryRaw`SELECT "key" FROM "PinAttempt" WHERE "key" = ${key} FOR UPDATE`;
    const attempts = (await tx.pinAttempt.findUnique({ where: { key } }))!;
    if (attempts.blockedUntil && attempts.blockedUntil > now) return { retryAfter: Math.ceil((attempts.blockedUntil.getTime() - now.getTime()) / 1000) };
    if (!verifyPin(pin, config.pinHash)) {
      const failures = attempts.failures + 1;
      const cooldown = failures >= 5 ? Math.min(86400, 900 * 2 ** Math.min(attempts.lockouts, 7)) : 0;
      await tx.pinAttempt.update({ where: { key }, data: { failures: cooldown ? 0 : failures, lockouts: cooldown ? attempts.lockouts + 1 : attempts.lockouts, blockedUntil: cooldown ? new Date(now.getTime() + cooldown * 1000) : null } });
      return { retryAfter: cooldown, incorrect: true };
    }
    // Preserve all existing progress by reusing the stable owner ID.
    await tx.user.upsert({ where: { id: config.ownerId }, create: { id: config.ownerId, email: `${config.ownerId}@dev.local`, name: "Nikhil" }, update: {} });
    await tx.pinAttempt.update({ where: { key }, data: { failures: 0, lockouts: 0, blockedUntil: null } });
    const session = newSession(config, remember, now.getTime());
    await tx.ownerSession.deleteMany({ where: { expiresAt: { lte: now } } });
    await tx.ownerSession.create({ data: { id: sessionId(session.payload.sid), userId: config.ownerId, expiresAt: new Date(session.payload.exp * 1000) } });
    return { session };
  }, { timeout: 15_000 });
  // Throw after committing failed attempts; throwing inside rolls the throttle back.
  if (result.retryAfter) throw new ApiError("RATE_LIMITED", "Too many PIN attempts. Please wait before trying again.", { retryAfter: result.retryAfter });
  if (!result.session) throw new ApiError("UNAUTHENTICATED", "That PIN doesn’t match. Please try again.");
  return result.session;
}
