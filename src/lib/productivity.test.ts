import { describe, expect, it } from "vitest";
import { levelForPoints, pointsIntoLevel, streaks, weekStart } from "./productivity";

describe("productivity scoring", () => {
  it("uses transparent 100-point levels", () => {
    expect(levelForPoints(0)).toBe(1);
    expect(levelForPoints(99)).toBe(1);
    expect(levelForPoints(100)).toBe(2);
    expect(pointsIntoLevel(245)).toEqual({ current: 45, required: 100 });
  });

  it("starts weeks on Monday", () => {
    expect(weekStart(new Date("2026-07-25T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-07-20");
    expect(weekStart(new Date("2026-07-26T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-07-20");
  });

  it("keeps a streak alive until the current day ends", () => {
    expect(streaks(["2026-07-21", "2026-07-22", "2026-07-23"], "2026-07-24")).toEqual({ current: 3, best: 3, activeDays: 3 });
    expect(streaks(["2026-07-20", "2026-07-22", "2026-07-23"], "2026-07-24")).toEqual({ current: 2, best: 2, activeDays: 3 });
  });
});
