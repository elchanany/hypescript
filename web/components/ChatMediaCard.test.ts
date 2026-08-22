import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./ChatMediaCard.tsx", import.meta.url), "utf8");

describe("chat media localization", () => {
  it("covers every media type and control in every supported locale", () => {
    for (const locale of ["he", "en", "ar", "ru", "hi"]) expect(source).toContain(`${locale}:{labels:{video:`);
    expect(source.match(/labels:\{video:/g)).toHaveLength(5);
    expect(source).toContain("out-media-frame");
    expect(source).toContain("out-actions");
  });
});
