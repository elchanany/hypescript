import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./LandingProductExperience.tsx", import.meta.url), "utf8");

describe("landing product demo copy", () => {
  it("contains the full demo flow in every supported locale", () => {
    for (const locale of ["he", "en", "ar", "ru", "hi"]) expect(source).toContain(`${locale}: { label:`);
    expect(source.match(/steps:\[/g)).toHaveLength(5);
    expect(source).toContain("hsx-chat-operation");
    expect(source).toContain("hsx-chat-result");
  });

  it("keeps explicit copy blocks for every LTR locale", () => {
    for (const locale of ["en", "ru", "hi"]) expect(source).toMatch(new RegExp(`${locale}: \\{ label:`));
  });
});
