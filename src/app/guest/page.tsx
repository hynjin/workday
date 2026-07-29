import { GuestWorkspace } from "@/components/guest-workspace";
import { LanguageToggle } from "@/components/language-toggle";
import { getLocale } from "@/lib/i18n";

export default async function GuestPage() {
  const locale = await getLocale();
  return <div className="wd-guest-page"><div className="wd-guest-language"><LanguageToggle locale={locale}/></div><GuestWorkspace locale={locale}/></div>;
}
