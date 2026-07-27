import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rjhblcdwsfuwlgigpqod.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_GhDTc-fPkdEDxqtWezpwrA_kKyS74e8";
const ACCESS_COOKIE = "workday-access-token";
const REFRESH_COOKIE = "workday-refresh-token";

type AuthUser = { id: string; email?: string };
export type AuthSession = { access_token: string; refresh_token: string; expires_in: number; user: AuthUser };
type AuthResponse = Partial<AuthSession> & { user: AuthUser };
type AuthErrorPayload = {
  code?: string;
  error_code?: string;
  error_description?: string;
  msg?: string;
  message?: string;
};

export class AuthRequestError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AuthRequestError";
  }
}

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
  if (!response.ok) throw await authRequestError(response);
  return response.json() as Promise<AuthSession>;
}

export async function registerWithPassword(email: string, password: string) {
  const redirectTo = `${getSiteUrl()}/auth/callback`;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!response.ok) throw await authRequestError(response);
  return response.json() as Promise<AuthResponse>;
}

function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
    ?? "http://localhost:3000";
  return configured.replace(/\/$/, "");
}

async function authRequestError(response: Response) {
  const payload = await response.json().catch(() => ({})) as AuthErrorPayload;
  const code = payload.code ?? payload.error_code ?? `http_${response.status}`;
  return new AuthRequestError(code, payload.msg ?? payload.message ?? payload.error_description ?? "Authentication failed");
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
