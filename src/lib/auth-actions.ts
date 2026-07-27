"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthRequestError, authenticateWithPassword, clearAuthSession, registerWithPassword, saveAuthSession, type AuthSession } from "./auth";
import { getLocale } from "./i18n";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type AuthFormState = { error?: string; showSignUp?: boolean };

export async function submitAuth(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const locale = await getLocale();
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return {
    error: locale === "ko" ? "올바른 이메일과 8자 이상의 비밀번호를 입력해 주세요." : "Enter a valid email and a password of at least 8 characters.",
  };
  const intent = form.get("intent") === "signUp" ? "signUp" : "signIn";
  try {
    if (intent === "signUp") {
      const response = await registerWithPassword(parsed.data.email, parsed.data.password);
      if (!response.access_token) redirect("/login?checkEmail=1");
      await saveAuthSession(response as AuthSession);
    } else {
      await saveAuthSession(await authenticateWithPassword(parsed.data.email, parsed.data.password));
    }
  } catch (error) {
    if (error instanceof AuthRequestError) return mapAuthError(error.code, intent, locale);
    throw error;
  }
  redirect("/");
}

export async function signOut() {
  await clearAuthSession();
  redirect("/login");
}

export async function completeAuthSession(form: FormData) {
  const accessToken = form.get("accessToken");
  const refreshToken = form.get("refreshToken");
  const expiresIn = Number(form.get("expiresIn"));
  if (typeof accessToken !== "string" || typeof refreshToken !== "string" || !Number.isFinite(expiresIn)) {
    redirect("/login?authError=expired");
  }
  await saveAuthSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    user: { id: "" },
  });
  redirect("/");
}

function mapAuthError(code: string, intent: "signIn" | "signUp", locale: "ko" | "en"): AuthFormState {
  if (intent === "signIn") return {
    error: locale === "ko"
      ? "가입되지 않은 계정이거나 이메일 또는 비밀번호가 맞지 않습니다."
      : "This account does not exist, or the email or password is incorrect.",
    showSignUp: true,
  };
  if (code === "user_already_exists" || code === "email_exists" || code === "user_already_registered") return {
    error: locale === "ko" ? "이미 가입된 이메일입니다. 로그인해 주세요." : "This email already has an account. Sign in instead.",
  };
  if (code === "signup_disabled") return {
    error: locale === "ko" ? "현재 새 계정 가입이 닫혀 있습니다." : "New account signup is currently disabled.",
  };
  if (code === "weak_password") return {
    error: locale === "ko" ? "더 안전한 비밀번호를 사용해 주세요." : "Choose a stronger password.",
  };
  return {
    error: locale === "ko" ? "계정을 만들 수 없습니다. 잠시 후 다시 시도해 주세요." : "We couldn’t create the account. Please try again.",
  };
}
