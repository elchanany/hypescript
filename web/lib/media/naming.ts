export function renamedMediaName(currentName: string, requestedName: string): string {
  const cleaned = requestedName.trim().replace(/[\\/:*?"<>|]/g, "-");
  if (!cleaned) return currentName;
  const extension = currentName.match(/(\.[^.]+)$/)?.[1] || "";
  return extension && !/\.[^.]+$/.test(cleaned) ? cleaned + extension : cleaned;
}

