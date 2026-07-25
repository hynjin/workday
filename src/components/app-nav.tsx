import Link from "next/link";
import { getLocale, copy } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

export async function AppNav() {
  const locale = await getLocale(), labels = copy[locale].nav;
  return <div className="navRow"><nav className="appNav" aria-label={locale === "ko" ? "주요 메뉴" : "Main navigation"}>
    <Link href="/inbox">{labels[0]}</Link><Link href="/">{labels[1]}</Link><Link href="/upcoming">{labels[2]}</Link><Link href="/projects">{labels[3]}</Link><Link href="/growth">{labels[4]}</Link>
  </nav><form className="navSearch" action="/search"><input name="q" type="search" placeholder={locale === "ko" ? "작업·프로젝트 검색" : "Search tasks & projects"} aria-label={locale === "ko" ? "작업과 프로젝트 검색" : "Search tasks and projects"}/></form><LanguageToggle locale={locale}/></div>;
}
