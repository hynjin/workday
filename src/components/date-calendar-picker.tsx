"use client";

import { useState } from "react";

function key(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function DateCalendarPicker({ name = "date", initial, min, locale }: { name?: string; initial: string; min: string; locale: "ko" | "en" }) {
  const [selected, setSelected] = useState(initial);
  const [cursor, setCursor] = useState(() => new Date(`${initial.slice(0, 7)}-01T00:00:00Z`));
  const year = cursor.getUTCFullYear(), month = cursor.getUTCMonth();
  const firstOffset = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const label = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-CA", { year:"numeric", month:"long", timeZone:"UTC" }).format(cursor);
  const weekdays = locale === "ko" ? ["일","월","화","수","목","금","토"] : ["S","M","T","W","T","F","S"];
  const move = (amount: number) => setCursor(new Date(Date.UTC(year, month + amount, 1)));
  return <div className="wd-inline-calendar">
    <input type="hidden" name={name} value={selected}/>
    <header><button type="button" onClick={() => move(-1)} aria-label={locale === "ko" ? "이전 달" : "Previous month"}>‹</button><strong>{label}</strong><button type="button" onClick={() => move(1)} aria-label={locale === "ko" ? "다음 달" : "Next month"}>›</button></header>
    <div>{weekdays.map((day,index) => <span key={`${day}-${index}`}>{day}</span>)}{Array.from({length:firstOffset},(_,index) => <i key={`blank-${index}`}/>)}
      {Array.from({length:count},(_,index) => {
        const date = key(new Date(Date.UTC(year,month,index+1)));
        return <button type="button" disabled={date < min} className={date === selected ? "is-selected" : ""} onClick={() => setSelected(date)} key={date}>{index+1}</button>;
      })}
    </div>
  </div>;
}
