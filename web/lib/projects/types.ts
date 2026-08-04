/** Project creation / execution policy — Package B */

export type DataMode = "local" | "cloud" | "hybrid";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";
export type ProjectResolution = "1080p" | "720p" | "4k";
export type ProjectFps = 24 | 25 | 30;

export type ProcessingPreset =
  | "max_privacy"
  | "free_only"
  | "local_only"
  | "recommended_hybrid"
  | "cloud_fast"
  | "max_quality"
  | "custom";

export type StorageBackend =
  | "local_filesystem"
  | "browser_storage"
  | "supabase_storage"
  | "s3_compatible"
  | "r2"
  | "google_drive"
  | "dropbox"
  | "onedrive";

export type CapabilityKey =
  | "llm"
  | "transcription"
  | "image"
  | "video"
  | "voice"
  | "render"
  | "storage"
  | "speech_enhance";

export interface CapabilityChoice {
  providerId: string;
  modelId?: string;
  execution: "local" | "cloud";
}

export interface ProjectExecutionPolicy {
  dataMode: DataMode;
  aspectRatio: AspectRatio;
  resolution: ProjectResolution;
  fps: ProjectFps;
  background: string;
  storageBackend: StorageBackend;
  processingPreset: ProcessingPreset;
  allowCloudMetadata: boolean;
  zeroCostPreferred: boolean;
  capabilities: Partial<Record<CapabilityKey, CapabilityChoice>>;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMetaV2 {
  id: string;
  name: string;
  updatedAt: number;
  createdAt?: number;
  dataMode?: DataMode;
  aspectRatio?: AspectRatio;
  resolution?: ProjectResolution;
  archived?: boolean;
  trashedAt?: number | null;
}

export const DEFAULT_POLICY = (): ProjectExecutionPolicy => ({
  dataMode: "local",
  aspectRatio: "16:9",
  resolution: "1080p",
  fps: 30,
  background: "#000000",
  storageBackend: "browser_storage",
  processingPreset: "max_privacy",
  allowCloudMetadata: false,
  zeroCostPreferred: true,
  capabilities: {
    llm: { providerId: "deepseek", execution: "cloud" },
    transcription: { providerId: "groq-transcribe", execution: "cloud" },
    render: { providerId: "ffmpeg-wasm", execution: "local" },
    storage: { providerId: "browser_storage", execution: "local" },
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export function storageOptionsForMode(mode: DataMode): { id: StorageBackend; label: string; available: boolean; reason?: string }[] {
  const local = [
    { id: "browser_storage" as const, label: "אחסון דפדפן (IndexedDB / OPFS)", available: true },
    { id: "local_filesystem" as const, label: "מערכת קבצים מקומית", available: typeof window !== "undefined" && "showDirectoryPicker" in window, reason: "דורש File System Access API" },
  ];
  const cloud = [
    { id: "supabase_storage" as const, label: "Supabase Storage", available: false, reason: "דורש חיבור Storage + health-check (חבילה E)" },
    { id: "s3_compatible" as const, label: "S3-compatible", available: false, reason: "לא מחובר" },
    { id: "r2" as const, label: "Cloudflare R2", available: false, reason: "לא מחובר" },
    { id: "google_drive" as const, label: "Google Drive", available: false, reason: "לא מחובר" },
    { id: "dropbox" as const, label: "Dropbox", available: false, reason: "לא מחובר" },
    { id: "onedrive" as const, label: "OneDrive", available: false, reason: "לא מחובר" },
  ];
  if (mode === "local") return local;
  if (mode === "cloud") return [...cloud, ...local];
  return [...local, ...cloud];
}

export function presetApplies(preset: ProcessingPreset): Partial<ProjectExecutionPolicy> {
  switch (preset) {
    case "max_privacy":
    case "local_only":
      return { dataMode: "local", storageBackend: "browser_storage", zeroCostPreferred: true, allowCloudMetadata: false };
    case "free_only":
      return { zeroCostPreferred: true, allowCloudMetadata: false };
    case "recommended_hybrid":
      return { dataMode: "hybrid", storageBackend: "browser_storage", allowCloudMetadata: true, zeroCostPreferred: false };
    case "cloud_fast":
      return { dataMode: "cloud", storageBackend: "supabase_storage", allowCloudMetadata: true, zeroCostPreferred: false };
    case "max_quality":
      return { resolution: "4k", fps: 30, zeroCostPreferred: false };
    default:
      return {};
  }
}
