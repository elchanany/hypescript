import { describe, expect, it } from "vitest";
import { quotaCode, quotaMessage } from "./quotaMessaging";

describe("quota upgrade messaging", () => {
  it("extracts a server quota code from wrapped client errors", () => {
    expect(quotaCode(new Error("הענן לא מוכן: project_quota_exceeded"))).toBe("project_quota_exceeded");
  });

  it("returns useful marketing Hebrew copy without exposing internal codes", () => {
    expect(quotaMessage("project_quota_exceeded")).toContain("מגבלת הפרויקטים");
    expect(quotaMessage("project_quota_exceeded")).toContain("Pro");
    expect(quotaMessage("render_quota_exceeded")).toContain("דקות הרינדור");
    expect(quotaMessage("render_quota_exceeded")).not.toContain("quota");
    expect(quotaMessage("network_error")).toBeNull();
  });
});
