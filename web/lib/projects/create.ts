"use client";

import { createProject, deleteProject, kvGet, kvSet, listProjects, type ProjectMeta } from "@/lib/storage";
import { createCloudProject, type CloudProject } from "@/lib/cloud/client";
import { saveProjectPolicy } from "./policy";
import { DEFAULT_POLICY, type ProjectExecutionPolicy, type ProjectMetaV2 } from "./types";

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
      if (row) {
        row.cloudProjectId = cloud.id;
        await kvSet("projects", list);
      }
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

/** Creates a local cache entry for a project that already exists in Supabase. */
export async function ensureCloudProjectMirror(cloud: CloudProject): Promise<string> {
  const list = (await listProjects()) as ProjectMetaV2[];
  const existing = list.find((project) => project.cloudProjectId === cloud.id);
  if (existing) {
    const localState = await kvGet<Record<string, unknown>>(`p:${existing.id}:state`);
    if (!localState && cloud.editor_state && Object.keys(cloud.editor_state).length > 0) {
      await kvSet(`p:${existing.id}:state`, cloud.editor_state);
    }
    return existing.id;
  }

  const id = await createProject(cloud.name || "פרויקט בענן");
  const next = (await listProjects()) as ProjectMetaV2[];
  const row = next.find((project) => project.id === id);
  if (row) {
    row.dataMode = "cloud";
    row.cloudProjectId = cloud.id;
    row.createdAt = Date.parse(cloud.created_at) || Date.now();
    row.updatedAt = Date.parse(cloud.updated_at) || Date.now();
    await kvSet("projects", next);
  }
  const policy = DEFAULT_POLICY();
  policy.dataMode = "cloud";
  policy.cloudProjectId = cloud.id;
  policy.storageBackend = "r2";
  policy.allowCloudMetadata = true;
  policy.processingPreset = "cloud_fast";
  policy.capabilities.render = { providerId: "cloud-run-ffmpeg", execution: "cloud" };
  policy.capabilities.storage = { providerId: "cloudflare-r2", execution: "cloud" };
  await saveProjectPolicy(id, policy);
  if (cloud.editor_state && Object.keys(cloud.editor_state).length > 0) {
    await kvSet(`p:${id}:state`, cloud.editor_state);
  }
  return id;
}

export async function getProjectMeta(id: string): Promise<ProjectMetaV2 | null> {
  const list = (await kvGet<ProjectMeta[]>("projects")) || [];
  return (list.find((p) => p.id === id) as ProjectMetaV2) || null;
}
