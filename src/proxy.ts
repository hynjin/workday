import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, authCookieOptions, refreshAuthSession } from "@/lib/auth";

function expiresSoon(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return !payload.exp || payload.exp <= Math.floor(Date.now() / 1000) + 5 * 60;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken || (accessToken && !expiresSoon(accessToken))) return NextResponse.next();

  try {
    const session = await refreshAuthSession(refreshToken);
    const requestHeaders = new Headers(request.headers);
    const cookieHeader = request.headers.get("cookie") ?? "";
    requestHeaders.set("cookie", `${cookieHeader}; ${ACCESS_COOKIE}=${session.access_token}; ${REFRESH_COOKIE}=${session.refresh_token}`);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set(ACCESS_COOKIE, session.access_token, authCookieOptions(session.expires_in));
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, authCookieOptions(60 * 60 * 24 * 30));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    // A temporary network/Auth outage must not erase a potentially valid refresh
    // token. The next navigation or visibility refresh will retry.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
