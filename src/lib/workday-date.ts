export const WORKDAY_TIME_ZONE = "America/Toronto";
export const WORKDAY_BOUNDARY_HOUR = 5;

export function getWorkdayDate(now = new Date()): string {
  const shifted = new Date(now.getTime() - WORKDAY_BOUNDARY_HOUR * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WORKDAY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(shifted);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dateKeyToDate(key: string) { return new Date(`${key}T00:00:00.000Z`); }
export function nextDate(date: Date) { const d = new Date(date); d.setUTCDate(d.getUTCDate() + 1); return d; }
export function getBoundaryInstant(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  let guess = Date.UTC(year, month - 1, day, WORKDAY_BOUNDARY_HOUR);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: WORKDAY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    guess += Date.UTC(year, month - 1, day, WORKDAY_BOUNDARY_HOUR) - represented;
  }
  return new Date(guess);
}
export function formatWorkdayDate(date: Date, locale: "ko" | "en" = "ko") {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-CA", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }).format(date);
}
export function formatDuration(seconds: number, clock = false, locale: "ko" | "en" = "ko") {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600), m = Math.floor((safe % 3600) / 60), s = safe % 60;
  if (clock) return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  if (h) return locale === "ko" ? `${h}시간${m ? ` ${m}분` : ""}` : `${h}h${m ? ` ${m}m` : ""}`;
  return locale === "ko" ? `${m}분` : `${m}m`;
}
