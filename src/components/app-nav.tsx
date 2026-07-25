import Link from "next/link";
import { getLocale, copy } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

export async function AppNav() {
  const locale = await getLocale(), labels = copy[locale].nav;
  return <div className="navRow"><nav className="appNav" aria-label={locale === "ko" ? "주요 메뉴" : "Main navigation"}>
    <Link href="/inbox">{labels[0]}</Link><Link href="/">{labels[1]}</Link><Link href="/upcoming">{labels[2]}</Link><Link href="/projects">{labels[3]}</Link>
  </nav><LanguageToggle locale={locale}/></div>;
}
