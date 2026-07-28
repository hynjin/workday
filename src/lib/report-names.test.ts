import { describe, expect, it } from "vitest";
import { reportIdentityKey, resolveReportName } from "./report-names";

describe("report entity names", () => {
  it("shows the latest title for an existing Area instead of its old snapshot", () => {
    expect(resolveReportName("area-1", "Old English", new Map([["area-1", "English Study"]]))).toBe("English Study");
  });

  it("keeps the historical snapshot after an entity is deleted", () => {
    expect(resolveReportName("deleted-area", "English Study", new Map())).toBe("English Study");
  });

  it("groups renamed entities by stable ID", () => {
    expect(reportIdentityKey("area-1", "English Study", "No Area")).toBe("area-1");
  });
});
