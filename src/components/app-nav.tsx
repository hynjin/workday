import Link from "next/link";

export function AppNav() {
  return <nav className="appNav" aria-label="주요 메뉴">
    <Link href="/">이번 작업일</Link>
    <Link href="/library">전체 목록 · 준비</Link>
    <Link href="/summary">작업일 요약</Link>
  </nav>;
}
