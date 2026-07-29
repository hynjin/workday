"use client";

export function OpenQuickAddButton({ label, location, compact = false }: { label: string; location?: string; compact?: boolean }) {
  return <button className={compact ? "wd-button" : "wd-button is-primary"} type="button" onClick={() => window.dispatchEvent(new CustomEvent("workday:quick-add", { detail: { location } }))}><span aria-hidden="true">＋</span>{label}</button>;
}
