import type { ProjectMeta } from "@/lib/storage";
import type { ProjectMetaV2 } from "./types";

export const PROJECT_QUERY_KEY = "project";

export function editorProjectUrl(projectId: string): string {
  return `/?${PROJECT_QUERY_KEY}=${encodeURIComponent(projectId)}`;
}

export function requestedProjectId(projects: ProjectMeta[], requested: string | null): string | null {
  if (!requested) return null;
  const match = projects.find((project) => project.id === requested || (project as ProjectMetaV2).cloudProjectId === requested);
  return match ? match.id : null;
}
