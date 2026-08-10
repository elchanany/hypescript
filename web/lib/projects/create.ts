"use client";

import { createProject, deleteProject, kvGet, kvSet, listProjects, type ProjectMeta } from "@/lib/storage";
import { createCloudProject } from "@/lib/cloud/client";
import { saveProjectPolicy } from "./policy";
import type { ProjectExecutionPolicy, ProjectMetaV2 } from "./types";

export interface CreateProjectInput {
  name: string;
  policy: ProjectExecutionPolicy;
}

/** Create project with execution policy. Local media never uploads automatically. */
export async function createProjectWithPolicy(input: CreateProjectInput): Promise<string> {
  const name = input.name.trim() || "פרויקט";
  const id = await createProject(name);

  const list = (await listProjects()) as ProjectMetaV2[];
  const row = list.find((p) => p.id === id);
  if (row) {
    row.dataMode = input.policy.dataMode;
    row.aspectRatio = input.policy.aspectRatio;
    row.resolution = input.policy.resolution;
    row.createdAt = Date.now();
    row.archived = false;
    row.trashedAt = null;
    await kvSet("projects", list);
  }

  const policy: ProjectExecutionPolicy = {
    ...input.policy,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (policy.dataMode === "cloud" || (policy.dataMode === "hybrid" && policy.allowCloudMetadata)) {
    try {
      const cloud = await createCloudProject(name);
      policy.cloudProjectId = cloud.id;
      if (policy.dataMode === "cloud") {
        policy.storageBackend = "r2";
        policy.capabilities = {
          ...policy.capabilities,
          storage: { providerId: "cloudflare-r2", execution: "cloud" },
          render: { providerId: "cloud-run-ffmpeg", execution: "cloud" },
        };
      }
    } catch (error) {
      await deleteProject(id);
      throw new Error(error instanceof Error ? `הענן לא מוכן: ${error.message}` : "הענן לא מוכן");
    }
  }

  // Safety: Local mode never enables cloud storage silently.
  if (policy.dataMode === "local") {
    policy.storageBackend = policy.storageBackend === "local_filesystem" ? "local_filesystem" : "browser_storage";
    policy.allowCloudMetadata = !!policy.allowCloudMetadata;
  }

  await saveProjectPolicy(id, policy);
  return id;
}

export async function getProjectMeta(id: string): Promise<ProjectMetaV2 | null> {
  const list = (await kvGet<ProjectMeta[]>("projects")) || [];
  return (list.find((p) => p.id === id) as ProjectMetaV2) || null;
}
