import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/server", () => ({ connection: async () => {} }));
import { POST as unlockPOST } from "@/app/api/v1/auth/unlock/route";
import { POST as lockPOST } from "@/app/api/v1/auth/lock/route";
import { GET as progressGET } from "@/app/api/v1/progress/route";
import { db } from "@/lib/server/db";
import { hashPin } from "@/lib/auth/pin";
import { newSession, pinConfig, sessionId } from "@/lib/auth/session";
import { unlockOwner } from "@/lib/server/services/pin.service";
import { PROBLEMS } from "@/lib/problems";

const ownerId = `test-pin-${crypto.randomUUID()}`;
const config = { ownerId, pinHash: hashPin("0007"), secret: "test-session-secret-with-more-than-32-characters" };
const req = (body?: unknown, origin = "http://localhost") => new Request("http://localhost/api/v1/auth/unlock", { method: body ? "POST" : "GET", headers: { host:"localhost",origin,"content-type":"application/json" }, ...(body ? { body:JSON.stringify(body) } : {}) });
beforeAll(async () => {
  vi.stubEnv("APP_PIN_HASH",config.pinHash);vi.stubEnv("SESSION_SECRET",config.secret);vi.stubEnv("OWNER_USER_ID",ownerId);vi.stubEnv("VERCEL_ENV","production");
  await db.user.create({ data:{id:ownerId,email:`${ownerId}@example.test`} });
  await db.problemProgress.create({data:{userId:ownerId,problemId:PROBLEMS[0].id,completedAt:new Date(),completedDate:new Date("2026-10-15T00:00:00Z"),note:"Keep this note"}});
});
beforeEach(() => { jar.get.mockReturnValue(undefined);jar.set.mockClear(); });
afterAll(async () => {
  vi.unstubAllEnvs();
  await db.pinAttempt.deleteMany({where:{key:`owner:${ownerId}`}});
  await db.user.deleteMany({where:{id:ownerId}});await db.$disconnect();
});
describe("PIN access on Vercel", () => {
  it("rejects protected API access without a session, invalid PINs, and cross-origin login",async () => {
    expect((await progressGET(req())).status).toBe(401);
    expect((await unlockPOST(req({pin:"123",remember:false}))).status).toBe(400);
    expect((await unlockPOST(req({pin:"0007"},"https://evil.example"))).status).toBe(403);
    expect((await unlockPOST(req({pin:"9999"}))).status).toBe(401);
  });
  it("sets secure remembered cookies, restores the existing owner, and preserves progress on lock",async () => {
    const response = await unlockPOST(req({pin:"0007",remember:true}));expect(response.status).toBe(200);
    const [name,token,options] = jar.set.mock.calls[0];
    expect(name).toBe("__Host-dsa_session");expect(options).toMatchObject({httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:2592000});
    jar.get.mockReturnValue({value:token});
    const snapshot = await progressGET(req());expect(snapshot.status).toBe(200);
    expect((await snapshot.json()).notes[PROBLEMS[0].id]).toBe("Keep this note");
    expect((await lockPOST(new Request("http://localhost/api/v1/auth/lock",{method:"POST",headers:{host:"localhost",origin:"http://localhost"}}))).status).toBe(204);
    expect(jar.set.mock.calls.at(-1)?.[2].maxAge).toBe(0);
    // Even replaying a formerly valid cookie fails after its DB session was revoked.
    expect((await progressGET(req())).status).toBe(401);
    expect(await db.problemProgress.count({where:{userId:ownerId}})).toBe(1);
  });
  it("uses a short session cookie without remember and rejects expired DB sessions",async () => {
    expect((await unlockPOST(req({pin:"0007",remember:false}))).status).toBe(200);
    const [,token,options] = jar.set.mock.calls[0];expect(options.maxAge).toBeUndefined();jar.get.mockReturnValue({value:token});
    await db.ownerSession.updateMany({where:{userId:ownerId},data:{expiresAt:new Date(0)}});
    expect((await progressGET(req())).status).toBe(401);
    const forged = newSession(pinConfig()!,true);jar.get.mockReturnValue({value:forged.token});
    expect(await db.ownerSession.findUnique({where:{id:sessionId(forged.payload.sid)}})).toBeNull();
    expect((await progressGET(req())).status).toBe(401);
  });
  it("commits concurrent wrong attempts and enforces a persistent cooldown even for the correct PIN",async () => {
    await db.pinAttempt.deleteMany({where:{key:`owner:${ownerId}`}});
    const outcomes = await Promise.all(Array.from({length:5},() => unlockPOST(req({pin:"9999"}))));
    expect(outcomes.map((r)=>r.status).sort()).toEqual([401,401,401,401,429]);
    const blocked = await unlockPOST(req({pin:"0007"}));expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await db.pinAttempt.findUnique({where:{key:`owner:${ownerId}`}}))?.lockouts).toBe(1);
    await db.pinAttempt.update({where:{key:`owner:${ownerId}`},data:{blockedUntil:new Date(0)}});
    await expect(unlockOwner("0007",false)).resolves.toHaveProperty("token");
    expect((await db.pinAttempt.findUnique({where:{key:`owner:${ownerId}`}}))?.lockouts).toBe(0);
  });
});
