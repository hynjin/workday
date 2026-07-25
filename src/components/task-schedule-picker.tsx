"use client";

import { useRef, useTransition } from "react";
import { scheduleTaskForDate } from "@/lib/actions";
import type { Locale } from "@/lib/i18n";
import { dateKeyToDate, getWorkdayDate, nextDate } from "@/lib/workday-date";

export function TaskSchedulePicker({ taskId, locale, compact = false }: {
  taskId: string;
  locale: Locale;
  compact?: boolean;
}) {
  const today = getWorkdayDate();
  const tomorrow = nextDate(dateKeyToDate(today)).toISOString().slice(0, 10);
  const dateRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const schedule = (date: string) => {
    const form = new FormData();
    form.set("taskId", taskId);
    form.set("date", date);
    startTransition(() => scheduleTaskForDate(form));
  };

  return <div className={`taskSchedulePicker ${compact ? "compact" : ""}`} aria-busy={pending}>
    <button type="button" className="textButton accent" disabled={pending} onClick={() => schedule(today)}>{locale === "ko" ? "오늘" : "Today"}</button>
    <button type="button" className="textButton accent" disabled={pending} onClick={() => schedule(tomorrow)}>{locale === "ko" ? "내일" : "Tomorrow"}</button>
    <input
      ref={dateRef}
      type="date"
      min={today}
      defaultValue={today}
      aria-label={locale === "ko" ? "작업 날짜 선택" : "Choose task date"}
      disabled={pending}
      onChange={event => event.currentTarget.value && schedule(event.currentTarget.value)}
    />
  </div>;
}
