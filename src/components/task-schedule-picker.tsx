"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { scheduleTaskForDate, unscheduleTask } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { dateKeyToDate, getWorkdayDate, nextDate } from "@/lib/workday-date";

export function TaskSchedulePicker({ taskId, locale, compact = false, scheduledItem = null }: {
  taskId: string;
  locale: Locale;
  compact?: boolean;
  scheduledItem?: { id: string; date: string } | null;
}) {
  const today = getWorkdayDate();
  const tomorrow = nextDate(dateKeyToDate(today)).toISOString().slice(0, 10);
  const dateRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const schedule = (date: string) => {
    const form = new FormData();
    form.set("taskId", taskId);
    form.set("date", date);
    if (scheduledItem) form.set("scheduledItemId", scheduledItem.id);
    startTransition(() => scheduleTaskForDate(form));
    setOpen(false);
  };
  const unschedule = () => {
    if (!scheduledItem) return;
    const form = new FormData();
    form.set("taskId", taskId);
    form.set("scheduledItemId", scheduledItem.id);
    startTransition(() => unscheduleTask(form));
    setOpen(false);
  };

  return <div className={`wd-schedule-picker ${compact ? "is-compact" : ""}`} aria-busy={pending} ref={rootRef}>
    <button type="button" className="wd-schedule-trigger" disabled={pending} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span aria-hidden="true">▣</span>{scheduledItem?.date ?? (locale === "ko" ? "일정" : "Schedule")}
    </button>
    {open && <div className="wd-schedule-menu">
      <button type="button" disabled={pending} onClick={() => schedule(today)}>{locale === "ko" ? "오늘" : "Today"}</button>
      <button type="button" disabled={pending} onClick={() => schedule(tomorrow)}>{locale === "ko" ? "내일" : "Tomorrow"}</button>
      <label><span>{locale === "ko" ? "날짜 선택" : "Choose date"}</span><input
      ref={dateRef}
      type="date"
      min={today}
      value={scheduledItem?.date ?? ""}
      aria-label={locale === "ko" ? "작업 날짜 선택" : "Choose task date"}
      disabled={pending}
      onChange={event => event.currentTarget.value && schedule(event.currentTarget.value)}
    /></label>
    {scheduledItem && <button type="button" className="is-clear" disabled={pending} onClick={unschedule}>
      {locale === "ko" ? "일정 해제" : "Clear date"}
    </button>}
    </div>}
  </div>;
}
