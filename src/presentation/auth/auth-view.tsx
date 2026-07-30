"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApprovedIconSprite } from "@/presentation/schedule/schedule-view";

export type AuthLocale = "ko" | "en";
export type AuthMode = "login" | "signup";

const copy = {
  ko: {
    eyebrow:"나의 흐름을 가볍게 정리해요", headline:"오늘 할 일과 집중 시간을 한곳에서.",
    description:"복잡한 설정 없이 작업을 정리하고, 집중한 시간을 차분하게 기록해 보세요.",
    weekly:"이번 주 집중", welcome:"다시 만나서 반가워요", loginHelp:"계정에 로그인하고 오늘의 흐름을 이어가세요.",
    email:"이메일", password:"비밀번호", signIn:"로그인", guest:"로그인 없이 시작",
    newAccount:"처음이신가요? 계정 만들기", createTitle:"계정을 만들어 볼까요?",
    createHelp:"이메일과 비밀번호만 입력하면 바로 시작할 수 있어요.", passwordPlaceholder:"8자 이상 입력",
    passwordHelp:"영문, 숫자를 포함해 8자 이상 입력해 주세요.", consent:"이용약관과 개인정보 처리방침에 동의해요.",
    create:"계정 만들기", tryGuest:"로그인 없이 먼저 사용", existing:"이미 계정이 있나요? 로그인",
    back:"로그인으로 돌아가기",
  },
  en: {
    eyebrow:"PLAN YOUR FLOW", headline:"Tasks and focus time, together.",
    description:"Organize work without clutter and keep a calm record of your focus.",
    weekly:"Focus this week", welcome:"Welcome back", loginHelp:"Sign in to continue your day.",
    email:"Email", password:"Password", signIn:"Sign in", guest:"Continue without signing in",
    newAccount:"New here? Create an account", createTitle:"Create your account",
    createHelp:"Enter your email and password to get started.", passwordPlaceholder:"At least 8 characters",
    passwordHelp:"Use at least 8 characters with letters and numbers.", consent:"I agree to the Terms and Privacy Policy.",
    create:"Create account", tryGuest:"Try without signing in", existing:"Already have an account? Sign in",
    back:"Back to sign in",
  },
};

function Icon({name}:{name:string}) {
  return <svg aria-hidden="true"><use href={`#i-${name}`}/></svg>;
}

export function ApprovedAuthPresentation({initialMode,navigationBasePath="/ui-preview",onAuthenticate,onLocaleChange}:{initialMode:AuthMode;navigationBasePath?:string;onAuthenticate?:(form:FormData)=>Promise<void>;onLocaleChange?:(locale:AuthLocale)=>Promise<void>}) {
  const router=useRouter();
  const [locale,setLocale]=useState<AuthLocale>("ko");
  const [mode,setMode]=useState<AuthMode>(initialMode);
  const [consent,setConsent]=useState(false);
  const t=copy[locale];

  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  useEffect(()=>{setMode(initialMode);},[initialMode]);

  const changeMode=(next:AuthMode)=>{
    setMode(next);
    window.history.replaceState(null,"",`${navigationBasePath}/${next}`.replace("//","/"));
  };
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(onAuthenticate){const form=new FormData(event.currentTarget);form.set("intent",mode==="signup"?"signUp":"signIn");void onAuthenticate(form);}
    else router.push(`${navigationBasePath}/schedule`.replace("//","/"));
  };

  return <section className="auth-screen">
    <ApprovedIconSprite/>
    <header>
      <button className="brand auth-brand-button" type="button" onClick={()=>router.push(`${navigationBasePath}/login`.replace("//","/"))}>
        <span className="brand-mark"><Icon name="partly-sunny"/></span><strong>Workday</strong>
      </button>
      <button className="auth-language" type="button" onClick={()=>setLocale(value=>{const next=value==="ko"?"en":"ko";void onLocaleChange?.(next);return next;})}>
        <Icon name="globe"/><span>{locale==="ko"?"한국어":"English"}</span>
      </button>
    </header>
    <main>
      <div className="auth-copy">
        <span className="eyebrow">{t.eyebrow}</span><h1>{t.headline}</h1><p>{t.description}</p>
        <div className="auth-preview"><span className="goal-cloud"><Icon name="cloud"/></span><div><strong>{t.weekly}</strong><b>8h 45m</b><i><em/></i></div></div>
      </div>
      <section className="auth-card">
        {mode==="login"?<form className="auth-form auth-login-form" onSubmit={submit}>
          <div className="auth-card-head"><h2>{t.welcome}</h2><p>{t.loginHelp}</p></div>
          <label><span>{t.email}</span><input name="email" type="email" defaultValue={navigationBasePath? "hello@workday.app":""} required/></label>
          <label><span>{t.password}</span><input name="password" type="password" defaultValue={navigationBasePath?"workday123":""} minLength={8} required/></label>
          <button className="button primary auth-login" type="submit">{t.signIn}</button>
          <button className="button auth-guest" type="button" onClick={()=>router.push(`${navigationBasePath}/guest`.replace("//","/"))}>{t.guest}</button>
          <button className="auth-link" type="button" onClick={()=>changeMode("signup")}>{t.newAccount}</button>
        </form>:<form className="auth-form auth-signup-form" onSubmit={submit}>
          <div className="auth-card-head"><button className="auth-back" type="button" aria-label={t.back} onClick={()=>changeMode("login")}><Icon name="chevron-left"/></button><div><h2>{t.createTitle}</h2><p>{t.createHelp}</p></div></div>
          <label><span>{t.email}</span><input name="email" type="email" placeholder="name@example.com" required/></label>
          <label><span>{t.password}</span><input name="password" type="password" placeholder={t.passwordPlaceholder} minLength={8} required/><small>{t.passwordHelp}</small></label>
          <label className="auth-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>{t.consent}</span></label>
          <button className="button primary auth-create" type="submit" disabled={!consent}>{t.create}</button>
          <button className="button auth-guest" type="button" onClick={()=>router.push(`${navigationBasePath}/guest`.replace("//","/"))}>{t.tryGuest}</button>
          <button className="auth-link" type="button" onClick={()=>changeMode("login")}>{t.existing}</button>
        </form>}
      </section>
    </main>
  </section>;
}
