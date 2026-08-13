import { describe, expect, it } from "vitest";
import { editorProjectUrl, requestedProjectId } from "./navigation";

const projects = [
  { id: "prj_old", name: "ישן", updatedAt: 1 },
  { id: "prj_new", name: "חדש", updatedAt: 2 },
];

describe("project navigation", () => {
  it("builds an explicit editor URL for the newly-created project", () => {
    expect(editorProjectUrl("prj_new")).toBe("/?project=prj_new");
    expect(editorProjectUrl("id with spaces")).toBe("/?project=id%20with%20spaces");
  });

  it("accepts only a project that exists in the local project index", () => {
    expect(requestedProjectId(projects, "prj_new")).toBe("prj_new");
    expect(requestedProjectId(projects, "missing")).toBeNull();
    expect(requestedProjectId(projects, null)).toBeNull();
  });
});
