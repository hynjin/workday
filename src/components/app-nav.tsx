import { getLocale, copy } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { signOut } from "@/lib/auth-actions";
import { AppNavLinks } from "@/components/app-nav-links";
import { WorkdayIcon } from "@/components/workday-icon";

export async function AppNav() {
  const locale = await getLocale(), labels = copy[locale].nav;
  return <aside className="wd-sidebar">
    <div className="wd-brand"><span className="wd-brand-mark"><WorkdayIcon name="cloud" size={19}/></span><strong>Workday</strong></div>
    <AppNavLinks labels={labels}/>
    <form className="wd-nav-search" action="/search"><WorkdayIcon name="search" size={16}/><input name="q" type="search" placeholder={locale === "ko" ? "검색" : "Search"} aria-label={locale === "ko" ? "작업과 프로젝트 검색" : "Search tasks and projects"}/></form>
    <div className="wd-sidebar-bottom"><LanguageToggle locale={locale}/><form action={signOut}><button className="wd-nav-utility"><WorkdayIcon name="logout" size={16}/>{locale === "ko" ? "로그아웃" : "Sign out"}</button></form></div>
  </aside>;
}
