/** המרת markdown קל להודעות סוכן — bold, קוד, בלוקים להעתקה, רשימות. */

export type MdPart =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string }
  | { type: "codeblock"; text: string; lang?: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "ask"; text: string }
  | { type: "br" };

/** פיצול טקסט לחלקים להצגה. לא מנוע markdown מלא — מספיק לצ'אט. */
export function parseChatMarkdown(src: string): MdPart[] {
  const text = String(src || "").replace(/\r\n/g, "\n");
  if (!text) return [];
  const parts: MdPart[] = [];
  const blocks = text.split(/(```[\s\S]*?```)/g);
  for (const block of blocks) {
    if (!block) continue;
    if (block.startsWith("```") && block.endsWith("```")) {
      const inner = block.slice(3, -3);
      const nl = inner.indexOf("\n");
      const lang = nl >= 0 ? inner.slice(0, nl).trim() : "";
      const body = (nl >= 0 ? inner.slice(nl + 1) : inner).replace(/^\n|\n$/g, "");
      parts.push({ type: "codeblock", text: body, lang: lang || undefined });
      continue;
    }
    const lines = block.split("\n");
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^[-*•]\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*•]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^[-*•]\s+/, ""));
          i++;
        }
        parts.push({ type: "ul", items });
        continue;
      }
      if (/^\d+[.)]\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\d+[.)]\s+/, ""));
          i++;
        }
        parts.push({ type: "ol", items });
        continue;
      }
      if (/^[?؟]/.test(line.trim()) || /^(שאלה|בחירה)\s*:/i.test(line.trim())) {
        parts.push({ type: "ask", text: line.trim() });
        i++;
        continue;
      }
      if (line === "") {
        parts.push({ type: "br" });
        i++;
        continue;
      }
      // inline: **bold** and `code`
      const inline = line;
      const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(inline))) {
        if (m.index > last) parts.push({ type: "text", text: inline.slice(last, m.index) });
        const tok = m[0];
        if (tok.startsWith("**")) parts.push({ type: "bold", text: tok.slice(2, -2) });
        else parts.push({ type: "code", text: tok.slice(1, -1) });
        last = m.index + tok.length;
      }
      if (last < inline.length) parts.push({ type: "text", text: inline.slice(last) });
      if (i < lines.length - 1) parts.push({ type: "br" });
      i++;
    }
  }
  return parts;
}

/** שם קובץ מהקשר טקסט — עברית/ASCII בטוח לשם קובץ. */
export function contextualFileName(text: string, kind: "audio" | "video" | "srt" | "image", fallback: string): string {
  const raw = String(text || "").trim().replace(/\s+/g, " ");
  const slug = raw
    .slice(0, 40)
    .replace(/[^\u0590-\u05FFa-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 28);
  const ext = kind === "audio" ? "mp3" : kind === "video" ? "mp4" : kind === "srt" ? "srt" : "png";
  const prefix = kind === "audio" ? "קריינות" : kind === "video" ? "סרטון" : kind === "srt" ? "כתוביות" : "פריים";
  if (!slug) return fallback.includes(".") ? fallback : `${fallback}.${ext}`;
  return `${prefix}_${slug}.${ext}`;
}
