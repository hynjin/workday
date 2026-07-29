"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const saved = window.localStorage.getItem("workday-locale");
    if ((saved === "ko" || saved === "en") && saved !== locale) {
      document.cookie = `workday-locale=${saved}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [locale, router]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const change = (next: Locale) => {
    window.localStorage.setItem("workday-locale", next);
    document.cookie = `workday-locale=${next}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  };
  return <div className="languageToggle" ref={rootRef}>
    {open && <div className="languageMenu" aria-label="Language">
      <button type="button" className={locale === "ko" ? "active" : ""} onClick={() => change("ko")}>한국어</button>
      <button type="button" className={locale === "en" ? "active" : ""} onClick={() => change("en")}>English</button>
    </div>}
    <button className="navUtility languageTrigger" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21C9.7 18.5 8.5 15.5 8.5 12S9.7 5.5 12 3Z" stroke="currentColor" strokeWidth="1.8"/></svg>
      {locale === "ko" ? "한국어" : "English"}
    </button>
  </div>;
}
