// בדיקות טהורות לעזרי OpenAI Images: אימות בקשה, בניית payload, ניקוי סודות,
// ניסוח שגיאות בעברית ופענוח b64_json — בלי רשת ובלי env.

import { describe, expect, it } from "vitest";
import {
  buildImagePayload,
  decodeFirstImage,
  DEFAULT_OPENAI_IMAGE_MODEL,
  openaiImageErrorHe,
  parseImageRequest,
  redactSecrets,
} from "./images";

describe("parseImageRequest — אימות בקשת תמונה", () => {
  it("מקבל בקשה תקינה עם ברירות מחדל", () => {
    const result = parseImageRequest({ prompt: "כרזה לשיעור תורה" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      prompt: "כרזה לשיעור תורה",
      model: DEFAULT_OPENAI_IMAGE_MODEL,
      size: "1024x1024",
      quality: "auto",
      background: "auto",
    });
  });

  it("מקבל ערכים מפורשים תקינים", () => {
    const result = parseImageRequest({
      prompt: "  תמונה  ",
      model: "gpt-image-1",
      size: "1536x1024",
      quality: "high",
      background: "transparent",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.prompt).toBe("תמונה");
    expect(result.value.size).toBe("1536x1024");
    expect(result.value.quality).toBe("high");
    expect(result.value.background).toBe("transparent");
  });

  it("דוחה prompt ריק", () => {
    const result = parseImageRequest({ prompt: "   " });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("prompt");
  });

  it("דוחה prompt ארוך מדי", () => {
    const result = parseImageRequest({ prompt: "א".repeat(4001) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("ארוך מדי");
  });

  it("דוחה מודל לא נתמך (לא ממציאים מודל preview)", () => {
    const result = parseImageRequest({ prompt: "x", model: "gpt-image-2-preview" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("מודל");
  });

  it("דוחה גודל לא נתמך", () => {
    const result = parseImageRequest({ prompt: "x", size: "512x512" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("גודל");
  });

  it("דוחה איכות לא נתמכת", () => {
    const result = parseImageRequest({ prompt: "x", quality: "ultra" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("איכות");
  });

  it("דוחה רקע לא נתמך", () => {
    const result = parseImageRequest({ prompt: "x", background: "striped" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("רקע");
  });

  it("דוחה גוף לא-אובייקט", () => {
    expect(parseImageRequest(null).ok).toBe(false);
    expect(parseImageRequest("text").ok).toBe(false);
    expect(parseImageRequest(undefined).ok).toBe(false);
  });
});

describe("buildImagePayload — גוף רשמי ל-/v1/images/generations", () => {
  it("שולח output_format=png עם n=1 — בלי response_format (GPT Image מחזיר תמיד b64_json)", () => {
    const payload = buildImagePayload({
      prompt: "x",
      model: "gpt-image-1",
      size: "1024x1536",
      quality: "medium",
      background: "opaque",
    });
    expect(payload).toEqual({
      model: "gpt-image-1",
      prompt: "x",
      n: 1,
      size: "1024x1536",
      quality: "medium",
      background: "opaque",
      output_format: "png",
    });
    expect(payload).not.toHaveProperty("response_format");
  });
});

describe("redactSecrets / openaiImageErrorHe — ניקוי סודות", () => {
  it("מסיר מפתחות sk- מהטקסט", () => {
    expect(redactSecrets("error sk-abc123XYZ456")).toBe("error sk-***");
    expect(redactSecrets("no secrets here")).toBe("no secrets here");
  });

  it("401 → הודעה על OPENAI_API_KEY בלי ערך המפתח", () => {
    const msg = openaiImageErrorHe(401, "invalid api key sk-abc123XYZ456");
    expect(msg).toContain("OPENAI_API_KEY");
    expect(msg).not.toContain("sk-abc123XYZ456");
  });

  it("429 → חריגת קצב", () => {
    expect(openaiImageErrorHe(429, "rate limit")).toContain("חריגה");
  });

  it("400 → מחזיר את פירוט השגיאה מנוקה", () => {
    const msg = openaiImageErrorHe(400, "bad request sk-secret123");
    expect(msg).toContain("נדחתה");
    expect(msg).not.toContain("sk-secret123");
  });

  it("500+ → תקלה זמנית", () => {
    expect(openaiImageErrorHe(500, "boom")).toContain("תקלה זמנית");
  });
});

describe("decodeFirstImage — פענוח data[0].b64_json", () => {
  it("מפענח את התמונה הראשונה כ-PNG (Content-Type image/png)", () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    let b64 = "";
    for (const b of bytes) b64 += String.fromCharCode(b);
    const result = decodeFirstImage({ data: [{ b64_json: btoa(b64) }] });
    expect(result).not.toBeNull();
    expect(result!.bytes).toEqual(bytes);
    expect(result!.mime).toBe("image/png");
  });

  it("מחזיר null כשאין data או b64_json", () => {
    expect(decodeFirstImage({})).toBeNull();
    expect(decodeFirstImage({ data: [] })).toBeNull();
    expect(decodeFirstImage({ data: [{ url: "https://x" }] })).toBeNull();
    expect(decodeFirstImage({ data: [{ b64_json: "!!!not-base64!!!" }] })).toBeNull();
  });
});