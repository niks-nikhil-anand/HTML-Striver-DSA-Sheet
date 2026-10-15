import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";
import { hashPin } from "@/lib/auth/pin";
import { newSession } from "@/lib/auth/session";
const auth = { ownerId:"dev-user",pinHash:hashPin("0007"),secret:"proxy-test-secret-with-32-plus-characters" };
afterEach(() => vi.unstubAllEnvs());
describe("protected-page proxy", () => {
  it("protects tracker pages while allowing image optimization and static assets", () => {
    for (const url of ["/", "/problems", "/topics", "/milestones", "/settings"]) expect(unstable_doesMiddlewareMatch({config,url})).toBe(true);
    for (const url of ["/images/consistency-beats-talent.png", "/logo/logo.png", "/_next/image?url=x", "/_next/static/chunk.js", "/api/v1/progress"]) expect(unstable_doesMiddlewareMatch({config,url})).toBe(false);
  });
  it("redirects locked requests to their original page and allows signed cookies", () => {
    vi.stubEnv("APP_PIN_HASH",auth.pinHash);vi.stubEnv("SESSION_SECRET",auth.secret);vi.stubEnv("OWNER_USER_ID",auth.ownerId);vi.stubEnv("VERCEL_ENV","production");
    const redirect = proxy(new NextRequest("https://tracker.example/problems?q=array"));
    expect(redirect.status).toBe(307);
    expect(new URL(redirect.headers.get("location")!).searchParams.get("next")).toBe("/problems?q=array");
    const session = newSession(auth,true);
    const allowed = proxy(new NextRequest("https://tracker.example/problems",{headers:{cookie:`__Host-dsa_session=${session.token}`,"x-dsa-return-to":"https://evil.example"}}));
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("x-middleware-request-x-dsa-return-to")).toBe("/problems");
  });
});
