"use client";

import { useRef, useTransition } from "react";
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
  const [pending, startTransition] = useTransition();

  const schedule = (date: string) => {
    const form = new FormData();
    form.set("taskId", taskId);
    form.set("date", date);
    if (scheduledItem) form.set("scheduledItemId", scheduledItem.id);
    startTransition(() => scheduleTaskForDate(form));
  };
  const unschedule = () => {
    if (!scheduledItem) return;
    const form = new FormData();
    form.set("taskId", taskId);
    form.set("scheduledItemId", scheduledItem.id);
    startTransition(() => unscheduleTask(form));
  };

  return <div className={`taskSchedulePicker ${compact ? "compact" : ""}`} aria-busy={pending}>
    <button type="button" className="textButton accent" disabled={pending} onClick={() => schedule(today)}>{locale === "ko" ? "오늘" : "Today"}</button>
    <button type="button" className="textButton accent" disabled={pending} onClick={() => schedule(tomorrow)}>{locale === "ko" ? "내일" : "Tomorrow"}</button>
    <input
      ref={dateRef}
      type="date"
      min={today}
      value={scheduledItem?.date ?? ""}
      aria-label={locale === "ko" ? "작업 날짜 선택" : "Choose task date"}
      disabled={pending}
      onChange={event => event.currentTarget.value && schedule(event.currentTarget.value)}
    />
    {scheduledItem && <button type="button" className="textButton muted" disabled={pending} onClick={unschedule}>
      {locale === "ko" ? "일정 해제" : "Clear date"}
    </button>}
  </div>;
}
