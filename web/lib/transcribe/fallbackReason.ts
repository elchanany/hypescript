/**
 * Why the premium transcription engine (ElevenLabs) was skipped, derived from its HTTP status.
 * Lives outside the route module because Next.js route files may only export HTTP handlers.
 * Pairs with `fallbackMessageHe` in ./client.ts — keep the two in sync.
 */
export function elevenLabsFallbackReason(status: number): string {
  if (status === 401 || status === 403) return "elevenlabs_key_rejected";
  if (status === 429) return "elevenlabs_quota_exhausted";
  if (status === 413) return "elevenlabs_file_too_large";
  if (status >= 500) return "elevenlabs_unavailable";
  return `elevenlabs_http_${status}`;
}
