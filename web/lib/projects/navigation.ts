import type { ProjectMeta } from "@/lib/storage";

export const PROJECT_QUERY_KEY = "project";

export function editorProjectUrl(projectId: string): string {
  return `/?${PROJECT_QUERY_KEY}=${encodeURIComponent(projectId)}`;
}

export function requestedProjectId(projects: ProjectMeta[], requested: string | null): string | null {
  if (!requested) return null;
  return projects.some((project) => project.id === requested) ? requested : null;
}
