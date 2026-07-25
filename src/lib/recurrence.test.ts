import { describe, expect, it } from "vitest";
import { occurrenceDateKeys } from "./recurrence";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("occurrenceDateKeys", () => {
  it("generates interval-based daily occurrences", () => {
    expect(occurrenceDateKeys({
      frequency: "daily", interval: 2, weekdays: [], monthDay: null, startsOn: date("2026-07-24"), endsOn: null,
    }, "2026-07-24", "2026-07-30")).toEqual(["2026-07-24", "2026-07-26", "2026-07-28", "2026-07-30"]);
  });

  it("generates selected weekdays without dates before the start", () => {
    expect(occurrenceDateKeys({
      frequency: "weekly", interval: 1, weekdays: [1, 3], monthDay: null, startsOn: date("2026-07-24"), endsOn: null,
    }, "2026-07-20", "2026-08-02")).toEqual(["2026-07-27", "2026-07-29"]);
  });

  it("skips months that do not contain the selected day", () => {
    expect(occurrenceDateKeys({
      frequency: "monthly", interval: 1, weekdays: [], monthDay: 31, startsOn: date("2026-07-31"), endsOn: date("2026-10-31"),
    }, "2026-07-01", "2026-10-31")).toEqual(["2026-07-31", "2026-08-31", "2026-10-31"]);
  });
});
