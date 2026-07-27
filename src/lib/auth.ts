import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rjhblcdwsfuwlgigpqod.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_GhDTc-fPkdEDxqtWezpwrA_kKyS74e8";
const ACCESS_COOKIE = "workday-access-token";
const REFRESH_COOKIE = "workday-refresh-token";

type AuthUser = { id: string; email?: string };
type AuthSession = { access_token: string; refresh_token: string; expires_in: number; user: AuthUser };

function authHeaders(accessToken?: string) {
  return {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function getOptionalUser(): Promise<AuthUser | null> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  return response.ok ? response.json() as Promise<AuthUser> : null;
}

export async function requireUserId() {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user.id;
}

export async function ownedWorkdayWhere(workdayDate: Date) {
  return { userId_workdayDate: { userId: await requireUserId(), workdayDate } };
}

export async function authenticateWithPassword(email: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("이메일 또는 비밀번호를 확인해 주세요.");
  return response.json() as Promise<AuthSession>;
}

export async function registerWithPassword(email: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("계정을 만들 수 없습니다. 입력값을 확인해 주세요.");
  return response.json() as Promise<AuthSession>;
}

export async function saveAuthSession(session: AuthSession) {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(ACCESS_COOKIE, session.access_token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: session.expires_in });
  store.set(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearAuthSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
