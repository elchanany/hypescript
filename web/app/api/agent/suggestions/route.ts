import { NextRequest, NextResponse } from "next/server";
import { getAiAccess } from "@/lib/billing/aiAccess.server";
import { callProvider, configuredProviders } from "@/lib/agent/providers";
import { parseSuggestions, suggestionPrompt } from "@/lib/agent/suggestions";
import { Provider } from "@/lib/agent/types";
import { requireCloudUser } from "@/lib/cloud/auth";
import { isByokProvider, readByokKey } from "@/lib/providers/byok.server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCloudUser();
    if (auth.response) return auth.response;
    const body = await req.json();
    const prompt = suggestionPrompt(body?.messages, body?.context || {});
    if (!prompt) return NextResponse.json({ suggestions: [] });

    const access = await getAiAccess(auth.supabase, auth.user);
    if (access.providerMode === "byok" && isByokProvider(body?.provider)) {
      const key = await readByokKey(auth.user.id, body.provider);
      if (key) {
        const result = await callProvider(body.provider, prompt, [], { apiKey: key, maxTokens: 220 });
        return NextResponse.json({ suggestions: parseSuggestions(result.content) });
      }
    }

    const configured = configuredProviders();
    const order: Provider[] = ["deepseek", "openai", "gemini", "anthropic"];
    for (const provider of order.filter((candidate) => configured[candidate])) {
      try {
        const result = await callProvider(provider, prompt, [], { maxTokens: 220 });
        const suggestions = parseSuggestions(result.content);
        if (suggestions.length) return NextResponse.json({ suggestions });
      } catch (error) {
        console.error("Suggestion provider failed", provider, error instanceof Error ? error.message.slice(0, 160) : "unknown");
      }
    }
    return NextResponse.json({ suggestions: [] });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
