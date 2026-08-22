import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const body = readFileSync(new URL("./LandingLocalizedBody.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/welcome/page.tsx", import.meta.url), "utf8");

describe("localized landing body", () => {
  it("supplies complete non-Hebrew landing sections", () => {
    for (const locale of ["en", "ar", "ru", "hi"]) expect(body).toContain(`${locale}:{proof:`);
    expect(body.match(/features:\[\[/g)).toHaveLength(4);
    expect(body.match(/plans:\[/g)).toHaveLength(4);
    expect(body.match(/faq:\[\[/g)).toHaveLength(4);
  });

  it("keeps the original rich Hebrew body and switches other locales cleanly", () => {
    expect(page).toContain("<LandingLocalizedBody />");
    expect(page.match(/<LandingHebrewOnly>/g)).toHaveLength(2);
  });
});
