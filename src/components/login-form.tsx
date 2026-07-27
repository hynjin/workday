"use client";

import { useActionState } from "react";
import { submitAuth, type AuthFormState } from "@/lib/auth-actions";
import type { Locale } from "@/lib/i18n";

const initialState: AuthFormState = {};

export function LoginForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(submitAuth, initialState);
  return <form className="authForm" action={action}>
    <label>
      <span>{locale === "ko" ? "이메일" : "Email"}</span>
      <input type="email" name="email" autoComplete="email" required aria-describedby={state.error ? "auth-error" : undefined}/>
    </label>
    <label>
      <span>{locale === "ko" ? "비밀번호 (8자 이상)" : "Password (8+ characters)"}</span>
      <input type="password" name="password" minLength={8} autoComplete="current-password" required/>
    </label>
    {state.error && <div className="authError" id="auth-error" role="alert">
      <strong>{state.error}</strong>
      {state.showSignUp && <span>{locale === "ko" ? "처음이라면 아래의 ‘계정 만들기’를 사용하세요." : "New here? Use “Create account” below."}</span>}
    </div>}
    <div>
      <button className="button" name="intent" value="signIn" disabled={pending}>{pending ? (locale === "ko" ? "처리 중…" : "Working…") : (locale === "ko" ? "로그인" : "Sign in")}</button>
      <button className="button secondary" name="intent" value="signUp" disabled={pending}>{locale === "ko" ? "계정 만들기" : "Create account"}</button>
    </div>
    <p className="authPolicy">{locale === "ko"
      ? "계정 만들기를 누르면 새 계정을 신청합니다. 이메일 확인이 켜져 있으면 확인 링크를 연 뒤 로그인할 수 있습니다."
      : "Create account starts a new signup. If email confirmation is enabled, confirm the email before signing in."}</p>
  </form>;
}
