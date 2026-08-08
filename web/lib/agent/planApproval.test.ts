import { describe, expect, it } from "vitest";
import { approvedPlanPrompt, parsePlanSteps } from "./planApproval";

describe("plan approval", () => {
  it("extracts markdown checklists and numbered plans", () => {
    expect(parsePlanSteps("תוכנית:\n- [ ] חתוך פתיח\n- [x] נקה שתיקות\n3. צור כתוביות")).toEqual([
      "חתוך פתיח",
      "נקה שתיקות",
      "צור כתוביות",
    ]);
  });

  it("falls back to meaningful lines and caps the visible checklist", () => {
    expect(parsePlanSteps("## תוכנית\nנשמור את החלק המרכזי\nנייצא בפורמט אנכי")).toEqual([
      "נשמור את החלק המרכזי",
      "נייצא בפורמט אנכי",
    ]);
    expect(parsePlanSteps(Array.from({ length: 20 }, (_, i) => `- שלב ${i + 1}`).join("\n"))).toHaveLength(12);
  });

  it("creates an explicit execution instruction containing the approved plan", () => {
    const prompt = approvedPlanPrompt("- [ ] חתוך פתיח");
    expect(prompt).toContain("אישרתי במפורש");
    expect(prompt).toContain("- [ ] חתוך פתיח");
  });
});
