import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE, authCookieOptions, refreshAuthSession } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.json({ refreshed: false }, { status: 401 });
  try {
    const session = await refreshAuthSession(refreshToken);
    const response = NextResponse.json({ refreshed: true });
    response.cookies.set(ACCESS_COOKIE, session.access_token, authCookieOptions(session.expires_in));
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, authCookieOptions(60 * 60 * 24 * 30));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ refreshed: false }, { status: 503 });
  }
}
