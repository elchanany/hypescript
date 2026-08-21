// כותרת שיחה אוטומטית (LLM זול, כמו ב-ChatGPT). נקרא פעם אחת בלבד לכל שיחה —
// ה"פעם אחת" נאכפת בצד הלקוח (Conversation.titleGenerated), לא כאן; הראוט
// הזה רק מייצר כותרת נתונה טקסט. מפתחות תמיד בצד שרת, כמו שאר /api/agent/*.

import { NextRequest, NextResponse } from "next/server";
import { getAiAccess } from "@/lib/billing/aiAccess.server";
import { callProvider, configuredProviders } from "@/lib/agent/providers";
import { cleanGeneratedTitle, titlePrompt } from "@/lib/agent/title";
import { Provider } from "@/lib/agent/types";
import { requireCloudUser } from "@/lib/cloud/auth";
import { isByokProvider, readByokKey } from "@/lib/providers/byok.server";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCloudUser();
    if (auth.response) return auth.response;
    const body = await req.json();
    const prompt = titlePrompt(String(body?.message || ""));
    if (!prompt) return NextResponse.json({ title: "" });

    const access = await getAiAccess(auth.supabase, auth.user);
    if (access.providerMode === "byok" && isByokProvider(body?.provider)) {
      const key = await readByokKey(auth.user.id, body.provider);
      if (key) {
        const result = await callProvider(body.provider, prompt, [], { apiKey: key, maxTokens: 40 });
        return NextResponse.json({ title: cleanGeneratedTitle(result.content) });
      }
    }

    const configured = configuredProviders();
    const order: Provider[] = ["deepseek", "openai", "gemini", "anthropic"];
    for (const provider of order.filter((candidate) => configured[candidate])) {
      try {
        const result = await callProvider(provider, prompt, [], { maxTokens: 40 });
        const title = cleanGeneratedTitle(result.content);
        if (title) return NextResponse.json({ title });
      } catch (error) {
        console.error("Title provider failed", provider, error instanceof Error ? error.message.slice(0, 160) : "unknown");
      }
    }
    return NextResponse.json({ title: "" });
  } catch {
    return NextResponse.json({ title: "" });
  }
}
