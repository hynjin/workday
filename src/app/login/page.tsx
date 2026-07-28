import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getOptionalUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n";
import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ checkEmail?: string; authError?: string }> }) {
  const [user, locale, params] = await Promise.all([getOptionalUser(), getLocale(), searchParams]);
  if (user) redirect("/");
  return <main className="authShell"><div className="authLanguage"><LanguageToggle locale={locale}/></div>
    <section className="panel authCard">
      <p className="eyebrow">WORKDAY</p>
      <h1>{locale === "ko" ? "내 작업 공간" : "Your workspace"}</h1>
      <p className="lede">{locale === "ko" ? "로그인하면 내 작업과 집중 기록만 표시됩니다." : "Sign in to see only your tasks and focus history."}</p>
      {params.checkEmail && <p className="readonlyNotice">{locale === "ko" ? "이메일의 확인 링크를 연 뒤 로그인해 주세요." : "Open the confirmation link in your email, then sign in."}</p>}
      {params.authError && <p className="authError" role="alert">{locale === "ko" ? "인증 링크가 잘못되었거나 만료되었습니다. 계정 만들기를 다시 시도해 주세요." : "The authentication link is invalid or expired. Try creating the account again."}</p>}
      <LoginForm locale={locale}/>
      <div className="authGuest"><span>{locale === "ko" ? "계정 없이 먼저 사용해도 됩니다." : "You can start without an account."}</span><Link className="button secondary full" href="/guest">{locale === "ko" ? "이 기기에서 시작" : "Start on this device"}</Link></div>
    </section>
  </main>;
}
