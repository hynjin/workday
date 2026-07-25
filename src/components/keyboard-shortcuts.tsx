"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

const routes: Record<string, string> = { i: "/inbox", t: "/", u: "/upcoming", p: "/projects", r: "/growth" };

export function KeyboardShortcuts({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const goPending = useRef(false);
  const goTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (event.key === "Escape") {
        setHelpOpen(false);
        goPending.current = false;
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (goPending.current && routes[key]) {
        event.preventDefault();
        goPending.current = false;
        router.push(routes[key]);
        return;
      }
      if (key === "g") {
        goPending.current = true;
        if (goTimer.current) clearTimeout(goTimer.current);
        goTimer.current = setTimeout(() => { goPending.current = false; }, 900);
      } else if (key === "q") {
        event.preventDefault();
        window.dispatchEvent(new Event("workday:quick-add"));
      } else if (event.key === "/") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".navSearch input")?.focus();
      } else if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(value => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (goTimer.current) clearTimeout(goTimer.current);
    };
  }, [router]);

  return <>
    <button type="button" className="shortcutHelpButton" onClick={() => setHelpOpen(true)} aria-label={locale === "ko" ? "키보드 단축키 보기" : "View keyboard shortcuts"}>?</button>
    {helpOpen && <div className="shortcutBackdrop" role="presentation" onClick={() => setHelpOpen(false)}>
      <section className="shortcutDialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onClick={event => event.stopPropagation()}>
        <header><h2 id="shortcut-title">{locale === "ko" ? "키보드 단축키" : "Keyboard shortcuts"}</h2><button type="button" onClick={() => setHelpOpen(false)} aria-label={locale === "ko" ? "닫기" : "Close"}>×</button></header>
        <dl><div><dt><kbd>Q</kbd></dt><dd>{locale === "ko" ? "빠른 추가 열기" : "Open Quick add"}</dd></div><div><dt><kbd>/</kbd></dt><dd>{locale === "ko" ? "검색으로 이동" : "Focus search"}</dd></div><div><dt><kbd>G</kbd> <kbd>I</kbd></dt><dd>{locale === "ko" ? "받은편지함" : "Go to Inbox"}</dd></div><div><dt><kbd>G</kbd> <kbd>T</kbd></dt><dd>{locale === "ko" ? "오늘" : "Go to Today"}</dd></div><div><dt><kbd>G</kbd> <kbd>U</kbd></dt><dd>{locale === "ko" ? "예정" : "Go to Upcoming"}</dd></div><div><dt><kbd>G</kbd> <kbd>P</kbd></dt><dd>{locale === "ko" ? "프로젝트" : "Go to Projects"}</dd></div><div><dt><kbd>G</kbd> <kbd>R</kbd></dt><dd>{locale === "ko" ? "성장" : "Go to Growth"}</dd></div><div><dt><kbd>?</kbd></dt><dd>{locale === "ko" ? "이 도움말 열기" : "Open this guide"}</dd></div></dl>
      </section>
    </div>}
  </>;
}
