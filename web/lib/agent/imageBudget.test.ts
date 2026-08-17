// שמירת גוף הבקשה מתחת למגבלת הפלטפורמה.
//
// הרגרסיה שנצרבה כאן: ארבעה פריימים בגודל ייצוא הצטברו בהיסטוריה, גוף הבקשה
// חצה את 4.5MB של Vercel, והשיחה מתה ב-FUNCTION_PAYLOAD_TOO_LARGE. גם "תמשיך"
// נכשל, כי הוא שולח בדיוק את אותה היסטוריה.

import { describe, expect, it } from "vitest";
import { DROPPED_IMAGES_NOTE, MAX_IMAGE_MESSAGES, pruneImageMessages } from "./runtime";
import type { ChatMessage } from "./types";

function frameMessage(url: string): ChatMessage {
  return {
    role: "user",
    content: [
      { type: "text", text: "הנה הפריימים שצולמו לבדיקה:" },
      { type: "image_url", image_url: { url } },
    ],
  };
}

const text = (content: string): ChatMessage => ({ role: "assistant", content });

describe("תקציב תמונות בהיסטוריה", () => {
  it("משאיר את הפריימים האחרונים בלבד", () => {
    const history = [
      frameMessage("data:image/jpeg;base64,one"),
      text("ניתוח"),
      frameMessage("data:image/jpeg;base64,two"),
      frameMessage("data:image/jpeg;base64,three"),
    ];
    pruneImageMessages(history, 2);

    expect(history[0].content).toBe(DROPPED_IMAGES_NOTE);
    expect(Array.isArray(history[2].content)).toBe(true);
    expect(Array.isArray(history[3].content)).toBe(true);
  });

  it("אינו נוגע בהודעות טקסט", () => {
    const history = [text("ראשונה"), text("שנייה")];
    pruneImageMessages(history, 1);
    expect(history.map((m) => m.content)).toEqual(["ראשונה", "שנייה"]);
  });

  it("אינו משנה כלום כשמספר הפריימים בתוך התקציב", () => {
    const history = [frameMessage("data:image/jpeg;base64,only")];
    pruneImageMessages(history);
    expect(Array.isArray(history[0].content)).toBe(true);
  });

  it("חוסם צמיחה בלתי מוגבלת של תמונות", () => {
    const history = Array.from({ length: 12 }, (_, i) => frameMessage(`data:image/jpeg;base64,f${i}`));
    pruneImageMessages(history);
    const withImages = history.filter((m) => Array.isArray(m.content));
    expect(withImages).toHaveLength(MAX_IMAGE_MESSAGES);
  });
});
