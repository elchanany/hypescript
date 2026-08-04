// Timeouts shared by the agent runtime and long client ops (transcribe / ffmpeg).

export const LLM_CALL_TIMEOUT_MS = 120_000;

/** Default ceiling for a single tool invocation. */
export const DEFAULT_TOOL_TIMEOUT_MS = 180_000;

/** Per-tool overrides — STT / render can legitimately take longer. */
export const TOOL_TIMEOUT_MS: Record<string, number> = {
  transcribe_video: 360_000,
  transcribe_timeline: 360_000,
  render_video: 600_000,
  generate_narration: 180_000,
  analyze_audio: 240_000,
  remove_silence: 240_000,
  extract_audio: 240_000,
};

export function toolTimeoutMs(name: string): number {
  return TOOL_TIMEOUT_MS[name] ?? DEFAULT_TOOL_TIMEOUT_MS;
}

export function timeoutError(label: string, ms: number, detail?: string): Error {
  const mins = Math.round(ms / 6000) / 10;
  const why = detail ? ` בשלב: ${detail}` : "";
  return new Error(
    `${label} נעצר אחרי ${mins} דק'${why}. ` +
      "נסה שוב, קובץ קצר יותר, או בדוק מפתח/ספק בהגדרות.",
  );
}

/** Race a promise against a wall-clock timeout. Does not cancel the underlying work. */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string, detail?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(timeoutError(label, ms, detail)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/**
 * Race against timeout AND an AbortSignal. On abort → Error with Hebrew reason.
 * Prefer this for agent tools so Stop cancels hung work.
 */
export function withTimeoutSignal<T>(
  p: Promise<T>,
  ms: number,
  label: string,
  signal?: AbortSignal,
  detail?: () => string | undefined,
): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(new Error(`${label} בוטל.`));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(new Error(`${label} בוטל.`));
    };
    const onTo = () => {
      cleanup();
      reject(timeoutError(label, ms, detail?.()));
    };
    const cleanup = () => {
      clearTimeout(t);
      signal?.removeEventListener("abort", onAbort);
    };
    const t = setTimeout(onTo, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
    p.then(
      (v) => { cleanup(); resolve(v); },
      (e) => { cleanup(); reject(e); },
    );
  });
}

/** Human-readable STT / TTS service name for chat tool cards. */
export function serviceLabelFor(provider: string, model?: string): string {
  const p = (provider || "").toLowerCase();
  const base =
    p === "elevenlabs" || p === "eleven" ? "ElevenLabs"
      : p === "groq" ? "Groq"
        : p === "openai" ? "OpenAI"
          : p === "deepseek" ? "DeepSeek"
            : p === "anthropic" ? "Anthropic"
              : p === "gemini" ? "Gemini"
                : provider || "ספק";
  return model ? `${base} · ${model}` : base;
}
