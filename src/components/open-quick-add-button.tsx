"use client";

export function OpenQuickAddButton({ label }: { label: string }) {
  return <button className="button quickAddOpen" type="button" onClick={() => window.dispatchEvent(new Event("workday:quick-add"))}><span aria-hidden="true">＋</span>{label}</button>;
}
