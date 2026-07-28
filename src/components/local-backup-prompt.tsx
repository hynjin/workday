"use client";

import { useEffect, useState } from "react";
import { exportGuestBundle, markBundleImported, type GuestBundle } from "@/lib/guest-db";
import type { Locale } from "@/lib/i18n";

type Result = { batchId: string; importedAt: string; created: { tasks: number; items: number; sessions: number }; skipped: { tasks: number; items: number; sessions: number } };

export function LocalBackupPrompt({ locale }: { locale: Locale }) {
  const [bundle, setBundle] = useState<GuestBundle | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    void exportGuestBundle().then(next => {
      const records = [...next.tasks, ...next.items, ...next.sessions];
      if (records.some(record => !record.importedAt)) setBundle(next);
    }).catch(() => {});
  }, []);
  if (!bundle) return null;
  const total = bundle.tasks.length + bundle.items.length + bundle.sessions.length;
  const backup = async () => {
    setStatus("uploading");
    const response = await fetch("/api/local-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bundle) }).catch(() => null);
    if (!response?.ok) { setStatus("error"); return; }
    const next = await response.json() as Result;
    await markBundleImported(next.importedAt);
    setResult(next); setStatus("done");
  };
  return <aside className="backupPrompt" role="status">
    <div><strong>{status === "done" ? (locale === "ko" ? "이 기기 기록을 백업했습니다." : "This device is backed up.") : (locale === "ko" ? "이 기기에 저장된 작업이 있습니다." : "This device has local work.")}</strong>
      <span>{status === "done" && result ? `${locale === "ko" ? "새로 가져옴" : "Imported"}: ${result.created.tasks + result.created.items + result.created.sessions} · ${locale === "ko" ? "중복 건너뜀" : "Duplicates skipped"}: ${result.skipped.tasks + result.skipped.items + result.skipped.sessions}` : `${total}${locale === "ko" ? "개 로컬 레코드 · 계정에 백업할까요?" : " local records · Back them up to your account?"}`}</span>
      {status === "error" && <span className="dangerText">{locale === "ko" ? "백업하지 못했습니다. 서버에는 일부 성공으로 기록되지 않았습니다. 다시 시도할 수 있습니다." : "Backup failed. No partial success was recorded. You can retry."}</span>}
    </div>
    <div>{status !== "done" && <button className="button" disabled={status === "uploading"} onClick={backup}>{status === "uploading" ? (locale === "ko" ? "검증·백업 중…" : "Validating & backing up…") : (locale === "ko" ? "계정에 백업" : "Back up to account")}</button>}<button className="textButton" onClick={() => setBundle(null)}>{locale === "ko" ? "나중에" : "Later"}</button></div>
  </aside>;
}
