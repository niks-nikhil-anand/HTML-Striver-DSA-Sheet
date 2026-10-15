import { NextResponse, type NextRequest } from "next/server";
import { localBypass, pinConfig, readSession, sessionCookieName } from "@/lib/auth/session";

/** Fast cookie check for page navigation; APIs and the layout also check the database. */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-dsa-return-to", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (request.nextUrl.pathname === "/unlock" || localBypass()) return NextResponse.next({ request: { headers } });
  const config = pinConfig();
  if (!config || !readSession(request.cookies.get(sessionCookieName())?.value, config)) {
    const url = new URL("/unlock", request.url);
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/((?!api/|_next/|favicon.ico|icon.png|logo/|images/|posters/).*)"] };
