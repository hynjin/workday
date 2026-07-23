"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const change = (next: Locale) => {
    document.cookie = `workday-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return <div className="languageToggle" aria-label="Language">
    <button type="button" className={locale === "ko" ? "active" : ""} onClick={() => change("ko")}>한국어</button>
    <button type="button" className={locale === "en" ? "active" : ""} onClick={() => change("en")}>EN</button>
  </div>;
}
