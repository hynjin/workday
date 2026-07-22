import { describe, expect, it } from "vitest";
import { formatDuration, getBoundaryInstant, getWorkdayDate } from "./workday-date";

describe("작업일 날짜", () => {
  it("오전 5시 전에는 전날이다", () => expect(getWorkdayDate(new Date("2026-07-22T06:00:00Z"))).toBe("2026-07-21"));
  it("오전 5시부터 당일이다", () => expect(getWorkdayDate(new Date("2026-07-22T09:00:00Z"))).toBe("2026-07-22"));
  it("시간을 읽기 좋게 표시한다", () => expect(formatDuration(4500)).toBe("1시간 15분"));
  it("여름철 오전 5시 경계를 UTC로 계산한다", () => expect(getBoundaryInstant("2026-07-22").toISOString()).toBe("2026-07-22T09:00:00.000Z"));
  it("겨울철 오전 5시 경계를 UTC로 계산한다", () => expect(getBoundaryInstant("2026-01-22").toISOString()).toBe("2026-01-22T10:00:00.000Z"));
});
