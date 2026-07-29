"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { WorkdayIcon } from "@/components/workday-icon";

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
  return <div className="wd-language" ref={rootRef}>
    {open && <div className="wd-language-menu" aria-label="Language">
      <button type="button" className={locale === "ko" ? "is-active" : ""} onClick={() => change("ko")}>한국어</button>
      <button type="button" className={locale === "en" ? "is-active" : ""} onClick={() => change("en")}>English</button>
    </div>}
    <button className="wd-nav-utility" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <WorkdayIcon name="language" size={16}/>
      {locale === "ko" ? "한국어" : "English"}
    </button>
  </div>;
}
