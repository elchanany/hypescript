"use client";

import { createProject, deleteProject, kvGet, kvSet, listProjects, type ProjectMeta } from "@/lib/storage";
import { createCloudProject, type CloudProject } from "@/lib/cloud/client";
import { quotaMessage } from "@/lib/billing/quotaMessaging";
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
      const rawMsg = error instanceof Error ? error.message : String(error || "");
      const quota = quotaMessage(rawMsg);
      if (quota) throw new Error(quota);
      if (rawMsg.includes("cloud_schema_unavailable")) throw new Error("שירות הענן אינו זמין כרגע. אנא נסה שוב בעוד מספר רגעים.");
      throw new Error(rawMsg || "יצירת הפרויקט בענן נכשלה");
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

/** Atomic synchronization of cloud projects into local storage without race conditions. */
export async function syncCloudProjects(cloudList: CloudProject[]): Promise<ProjectMetaV2[]> {
  const list = (await listProjects()) as ProjectMetaV2[];
  const localMapByCloudId = new Map<string, ProjectMetaV2>();
  for (const p of list) {
    if (p.cloudProjectId) {
      localMapByCloudId.set(p.cloudProjectId, p);
    }
  }

  let listChanged = false;
  const nextList = [...list];

  for (const cloud of cloudList) {
    if (cloud.state === "deleting") continue;
    const cloudUpdated = Date.parse(cloud.updated_at) || Date.now();
    const existing = localMapByCloudId.get(cloud.id);

    if (existing) {
      if (existing.name !== cloud.name || cloudUpdated > (existing.updatedAt || 0)) {
        existing.name = cloud.name || existing.name;
        existing.updatedAt = Math.max(existing.updatedAt || 0, cloudUpdated);
        listChanged = true;
      }
      if (cloud.editor_state && Object.keys(cloud.editor_state).length > 0) {
        await kvSet(`p:${existing.id}:state`, cloud.editor_state);
        const chat = (cloud.editor_state as Record<string, unknown>).chatStore;
        if (chat && typeof chat === "object") {
          await kvSet(`p:${existing.id}:chat`, chat);
        }
      }
    } else {
      const id = "prj_" + Math.random().toString(36).slice(2, 9);
      const newMeta: ProjectMetaV2 = {
        id,
        name: cloud.name || "פרויקט בענן",
        updatedAt: cloudUpdated,
        createdAt: Date.parse(cloud.created_at) || Date.now(),
        dataMode: "cloud",
        cloudProjectId: cloud.id,
        archived: false,
        trashedAt: null,
      };
      nextList.unshift(newMeta);
      localMapByCloudId.set(cloud.id, newMeta);
      listChanged = true;

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
        const chat = (cloud.editor_state as Record<string, unknown>).chatStore;
        if (chat && typeof chat === "object") {
          await kvSet(`p:${id}:chat`, chat);
        }
      }
    }
  }

  if (listChanged) {
    await kvSet("projects", nextList);
  }

  return nextList;
}

/** Creates or updates a local cache entry for a single project from Supabase. */
export async function ensureCloudProjectMirror(cloud: CloudProject): Promise<string> {
  const synced = await syncCloudProjects([cloud]);
  const matched = synced.find((p) => p.cloudProjectId === cloud.id);
  return matched ? matched.id : "";
}

export async function getProjectMeta(id: string): Promise<ProjectMetaV2 | null> {
  const list = (await kvGet<ProjectMeta[]>("projects")) || [];
  return (list.find((p) => p.id === id) as ProjectMetaV2) || null;
}

/** Ensures a local project has an active cloud registration and cloudProjectId in Supabase. */
export async function ensureCloudProjectId(projectId: string, name?: string): Promise<string | null> {
  const { ensureProjectPolicy, saveProjectPolicy } = await import("./policy");
  const policy = await ensureProjectPolicy(projectId);
  if (policy.cloudProjectId) return policy.cloudProjectId;
  if (policy.dataMode === "local") return null;

  try {
    const list = (await listProjects()) as ProjectMetaV2[];
    const meta = list.find((p) => p.id === projectId);
    const projectName = name || meta?.name || "פרויקט";
    const cloud = await createCloudProject(projectName);
    policy.cloudProjectId = cloud.id;
    policy.dataMode = "cloud";
    policy.storageBackend = "r2";
    policy.allowCloudMetadata = true;
    policy.capabilities = {
      ...policy.capabilities,
      storage: { providerId: "cloudflare-r2", execution: "cloud" },
      render: { providerId: "cloud-run-ffmpeg", execution: "cloud" },
    };
    await saveProjectPolicy(projectId, policy);

    if (meta) {
      meta.cloudProjectId = cloud.id;
      meta.dataMode = "cloud";
      await kvSet("projects", list);
    }
    return cloud.id;
  } catch (err) {
    console.warn("Could not automatically create cloud project:", err);
    return null;
  }
}
