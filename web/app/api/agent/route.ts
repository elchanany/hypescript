// Proxy לסוכן: מקבל {provider, messages, tools}, קורא מפתח מ-env, קורא ל-LLM,
// ומחזיר {content, tool_calls} מנורמל. המפתחות לעולם לא מגיעים לדפדפן.

import { NextRequest, NextResponse } from "next/server";
import { callProvider, configuredProviders } from "@/lib/agent/providers";
import { Provider } from "@/lib/agent/types";
import { requireCloudUser } from "@/lib/cloud/auth";
import { getAiAccess } from "@/lib/billing/aiAccess.server";
import { isByokProvider, readByokKey } from "@/lib/providers/byok.server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCloudUser();
    if (auth.response) return auth.response;
    const { provider, model, messages, tools } = await req.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "חסרות הודעות לשיחה." }, { status: 400 });
    }
    const access = await getAiAccess(auth.supabase, auth.user);

    if (access.providerMode === "byok") {
      if (!isByokProvider(provider)) return NextResponse.json({ error: "יש לבחור ספק BYOK שהוגדר בחשבון." }, { status: 400 });
      const key = await readByokKey(auth.user.id, provider);
      if (!key) return NextResponse.json({ error: "לספק שנבחר אין מפתח BYOK שמור." }, { status: 409 });
      const result = await callProvider(provider, messages, tools || [], { apiKey: key, model: String(model || "") });
      return NextResponse.json({ ...result, providerMode: "byok", provider });
    }

    // Managed mode is deliberately opaque: the browser neither chooses nor sees
    // the provider/model. Fail over only between keys configured by the operator.
    const configured = configuredProviders();
    const order: Provider[] = ["deepseek", "openai", "gemini", "anthropic"];
    const failures: string[] = [];
    for (const candidate of order.filter((id) => configured[id])) {
      try {
        const result = await callProvider(candidate, messages, tools || []);
        const { model: _model, ...safe } = result;
        return NextResponse.json({ ...safe, providerMode: "managed" });
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    console.error("Managed AI providers unavailable", failures.map((value) => value.slice(0, 160)));
    return NextResponse.json({ error: "שירות העריכה החכם אינו זמין כרגע. נסה שוב בעוד רגע." }, { status: 503 });
  } catch (err: any) {
    const message = String(err?.message || err || "שגיאה");
    const safe = /authentication_required|pro_required|byok/i.test(message)
      ? message
      : "שירות העריכה החכם נתקל בתקלה זמנית.";
    return NextResponse.json({ error: safe }, { status: 500 });
  }
}
