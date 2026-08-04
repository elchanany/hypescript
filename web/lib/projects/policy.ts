"use client";

import { kvGet, kvSet, pk } from "@/lib/storage";
import { DEFAULT_POLICY, type ProjectExecutionPolicy } from "./types";

export async function getProjectPolicy(projectId: string): Promise<ProjectExecutionPolicy | null> {
  return kvGet<ProjectExecutionPolicy>(pk(projectId, "policy"));
}

export async function saveProjectPolicy(projectId: string, policy: ProjectExecutionPolicy): Promise<void> {
  await kvSet(pk(projectId, "policy"), { ...policy, updatedAt: Date.now() });
}

export async function ensureProjectPolicy(projectId: string): Promise<ProjectExecutionPolicy> {
  const existing = await getProjectPolicy(projectId);
  if (existing) return existing;
  const fresh = DEFAULT_POLICY();
  await saveProjectPolicy(projectId, fresh);
  return fresh;
}
