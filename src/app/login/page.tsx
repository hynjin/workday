import { redirect } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-actions";
import { getOptionalUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ checkEmail?: string }> }) {
  const [user, locale, params] = await Promise.all([getOptionalUser(), getLocale(), searchParams]);
  if (user) redirect("/");
  return <main className="authShell">
    <section className="panel authCard">
      <p className="eyebrow">WORKDAY</p>
      <h1>{locale === "ko" ? "내 작업 공간" : "Your workspace"}</h1>
      <p className="lede">{locale === "ko" ? "로그인하면 내 작업과 집중 기록만 표시됩니다." : "Sign in to see only your tasks and focus history."}</p>
      {params.checkEmail && <p className="readonlyNotice">{locale === "ko" ? "이메일의 확인 링크를 연 뒤 로그인해 주세요." : "Open the confirmation link in your email, then sign in."}</p>}
      <form className="authForm">
        <label><span>{locale === "ko" ? "이메일" : "Email"}</span><input type="email" name="email" autoComplete="email" required/></label>
        <label><span>{locale === "ko" ? "비밀번호 (8자 이상)" : "Password (8+ characters)"}</span><input type="password" name="password" minLength={8} autoComplete="current-password" required/></label>
        <div><button className="button" formAction={signIn}>{locale === "ko" ? "로그인" : "Sign in"}</button><button className="button secondary" formAction={signUp}>{locale === "ko" ? "계정 만들기" : "Create account"}</button></div>
      </form>
    </section>
  </main>;
}
