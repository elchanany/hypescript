import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const creative = readFileSync(new URL("./LandingCreativeStack.tsx", import.meta.url), "utf8");
const devices = readFileSync(new URL("./LandingDeviceShowcase.tsx", import.meta.url), "utf8");
const gallery = readFileSync(new URL("./LandingUseCaseGallery.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/welcome/landing-v2.css", import.meta.url), "utf8");

describe("landing motion system", () => {
  it("animates a real request-edit-result sequence on tablet and phone", () => {
    expect(devices).toContain("const [phase, setPhase] = useState(0)");
    expect(devices).toContain('data-phase={phase}');
    expect(devices).toContain('aria-live="polite"');
  });

  it("shows connected providers and social formats with their own marks", () => {
    for (const name of ["ElevenLabs", "OpenAI", "Gemini", "Anthropic"]) expect(creative).toContain(`name:"${name}"`);
    for (const name of ["TikTok", "Instagram", "YouTube", "Facebook"]) expect(creative).toContain(`"${name}"`);
    expect(css).toContain('.creative-social img{width:25px;height:25px;filter:none}');
  });

  it("keeps the podcast photo landscape-safe and honors reduced motion", () => {
    expect(gallery).toContain("landing-usecase-tools");
    expect(css).toContain('.landing-usecase-card.podcast{grid-column:span 2;grid-row:auto}');
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
  });
});
