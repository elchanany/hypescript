import { describe, expect, it } from "vitest";
import { addComposerReference, serializeComposerMessage, type ComposerReference } from "./composerReferences";

const mediaRef: ComposerReference = { token: "@media:m_1", label: "לוגו חדש.png", kind: "media" };

describe("chat composer references", () => {
  it("keeps a file reference structured and unique", () => {
    expect(addComposerReference([mediaRef], mediaRef)).toEqual([mediaRef]);
  });

  it("serializes stable tokens only when the message is sent", () => {
    expect(serializeComposerMessage("שים אותו בצד שמאל", [mediaRef]))
      .toBe("@media:m_1 שים אותו בצד שמאל");
  });

  it("serializes a quoted message so the agent receives its exact context", () => {
    const quote: ComposerReference = {
      token: "[ציטוט הודעה מאת עוזר AI, 12:40]\nהטקסט המקורי\n[/ציטוט]",
      label: "הודעה של עוזר AI",
      kind: "message",
      preview: "הטקסט המקורי",
      author: "assistant",
      time: "12:40",
    };
    expect(serializeComposerMessage("תשנה את זה", [quote]))
      .toContain("הטקסט המקורי\n[/ציטוט] תשנה את זה");
  });
});
