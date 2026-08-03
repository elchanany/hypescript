// Message-history normalizer for tool-calling LLM providers.
//
// Providers (DeepSeek/OpenAI/Anthropic/Gemini) reject a conversation where an
// assistant message with `tool_calls` is NOT immediately followed by a `tool`
// result for EVERY tool_call_id (DeepSeek 400: "An assistant message with
// 'tool_calls' must be followed by tool messages responding to each
// 'tool_call_id'"). This happens when a run is interrupted (stop / tab close /
// crash) after the assistant asked for tools but before all results were
// recorded, and the partial history is later persisted and replayed.
//
// `repairToolMessages` heals such histories: it guarantees a matching tool
// result for each emitted tool_call_id (inserting a synthetic "cancelled"
// result when missing) and drops orphan tool results. Pure + idempotent so it
// is safe to run before every request and to unit-test.

import { ChatMessage } from "./types";

export const CANCELLED_RESULT = "(הפעולה לא הושלמה — נקטעה או בוטלה)";

export function repairToolMessages(history: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  const emittedCallIds = new Set<string>();

  for (let i = 0; i < history.length; i++) {
    const m = history[i];

    if (m.role === "assistant" && m.tool_calls && m.tool_calls.length) {
      out.push(m);
      for (const tc of m.tool_calls) emittedCallIds.add(tc.id);

      // Consume the tool results that immediately follow this assistant turn,
      // keeping the first result per id and preserving order.
      const seen = new Set<string>();
      let j = i + 1;
      for (; j < history.length && history[j].role === "tool"; j++) {
        const t = history[j];
        const id = t.tool_call_id;
        if (id && m.tool_calls.some((tc) => tc.id === id) && !seen.has(id)) {
          out.push(t);
          seen.add(id);
        }
        // duplicate / mismatched tool results are dropped
      }
      // Fill in synthetic results for any tool_call_id that got no response.
      for (const tc of m.tool_calls) {
        if (!seen.has(tc.id)) {
          out.push({ role: "tool", tool_call_id: tc.id, name: tc.name, content: CANCELLED_RESULT });
        }
      }
      i = j - 1;
      continue;
    }

    if (m.role === "tool") {
      // Orphan tool result (no preceding assistant tool_call) -> drop it.
      if (m.tool_call_id && emittedCallIds.has(m.tool_call_id)) out.push(m);
      continue;
    }

    out.push(m);
  }

  return out;
}

// True when the history already satisfies the tool-call/result invariant.
export function isToolHistoryValid(history: ChatMessage[]): boolean {
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.role === "assistant" && m.tool_calls && m.tool_calls.length) {
      const provided = new Set<string>();
      let j = i + 1;
      for (; j < history.length && history[j].role === "tool"; j++) {
        if (history[j].tool_call_id) provided.add(history[j].tool_call_id!);
      }
      for (const tc of m.tool_calls) if (!provided.has(tc.id)) return false;
    }
    if (m.role === "tool") {
      const id = m.tool_call_id;
      const hasCall = history.slice(0, i).some((p) => p.role === "assistant" && p.tool_calls?.some((tc) => tc.id === id));
      if (!hasCall) return false;
    }
  }
  return true;
}
