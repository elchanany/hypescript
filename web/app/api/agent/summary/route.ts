// זיכרון קצר-טווח בין שיחות: מסכם עד 5 שיחות קודמות לכמה משפטים. הלקוח
// אחראי על ה-caching (ChatStoreV2.memorySummary) — הראוט הזה רק מסכם טקסט
// נתון, בלי לדעת כלום על cache/fingerprint. מפתחות תמיד בצד שרת.

import { NextRequest, NextResponse } from "next/server";
import { getAiAccess } from "@/lib/billing/aiAccess.server";
import { callProvider, configuredProviders } from "@/lib/agent/providers";
import { cleanMemorySummaryText, memorySummaryPrompt, type MemorySource } from "@/lib/agent/memorySummary";
import { Provider } from "@/lib/agent/types";
import { requireCloudUser } from "@/lib/cloud/auth";
import { isByokProvider, readByokKey } from "@/lib/providers/byok.server";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseSources(raw: unknown): MemorySource[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .map((entry) => ({ title: String(entry.title || "שיחה"), text: String(entry.text || "") }))
    .filter((source) => source.text.trim())
    .slice(0, 5);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCloudUser();
    if (auth.response) return auth.response;
    const body = await req.json();
    const prompt = memorySummaryPrompt(parseSources(body?.sources));
    if (!prompt) return NextResponse.json({ summary: "" });

    const access = await getAiAccess(auth.supabase, auth.user);
    if (access.providerMode === "byok" && isByokProvider(body?.provider)) {
      const key = await readByokKey(auth.user.id, body.provider);
      if (key) {
        const result = await callProvider(body.provider, prompt, [], { apiKey: key, maxTokens: 180 });
        return NextResponse.json({ summary: cleanMemorySummaryText(result.content) });
      }
    }

    const configured = configuredProviders();
    const order: Provider[] = ["deepseek", "openai", "gemini", "anthropic"];
    for (const provider of order.filter((candidate) => configured[candidate])) {
      try {
        const result = await callProvider(provider, prompt, [], { maxTokens: 180 });
        const summary = cleanMemorySummaryText(result.content);
        if (summary) return NextResponse.json({ summary });
      } catch (error) {
        console.error("Memory summary provider failed", provider, error instanceof Error ? error.message.slice(0, 160) : "unknown");
      }
    }
    return NextResponse.json({ summary: "" });
  } catch {
    return NextResponse.json({ summary: "" });
  }
}
