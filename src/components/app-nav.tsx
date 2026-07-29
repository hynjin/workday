import { getLocale, copy } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { signOut } from "@/lib/auth-actions";
import { AppNavLinks } from "@/components/app-nav-links";

export async function AppNav() {
  const locale = await getLocale(), labels = copy[locale].nav;
  return <aside className="navRow">
    <div className="appBrand"><span className="appMark" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M6.5 15.5a5 5 0 0 1 .9-9.9A6.7 6.7 0 0 1 20 8.7a4 4 0 0 1-1 7.8H6.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M9 19h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></span><strong>Workday</strong></div>
    <AppNavLinks labels={labels}/>
    <form className="navSearch" action="/search"><span aria-hidden="true">⌕</span><input name="q" type="search" placeholder={locale === "ko" ? "검색" : "Search"} aria-label={locale === "ko" ? "작업과 프로젝트 검색" : "Search tasks and projects"}/></form>
    <div className="navBottom"><LanguageToggle locale={locale}/><form action={signOut}><button className="navUtility"><span aria-hidden="true">↪</span>{locale === "ko" ? "로그아웃" : "Sign out"}</button></form></div>
  </aside>;
}
