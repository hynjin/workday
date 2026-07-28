"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  useEffect(() => {
    const saved = window.localStorage.getItem("workday-locale");
    if ((saved === "ko" || saved === "en") && saved !== locale) {
      document.cookie = `workday-locale=${saved}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [locale, router]);
  const change = (next: Locale) => {
    window.localStorage.setItem("workday-locale", next);
    document.cookie = `workday-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return <div className="languageToggle" aria-label="Language">
    <button type="button" className={locale === "ko" ? "active" : ""} onClick={() => change("ko")}>한국어</button>
    <button type="button" className={locale === "en" ? "active" : ""} onClick={() => change("en")}>EN</button>
  </div>;
}
