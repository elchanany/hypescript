import { describe, expect, it } from "vitest";
import { LANDING_DEMO_COPY, LANDING_DEMO_IMAGES } from "./LandingProductExperience";

describe("localized landing demo", () => {
  it("uses a distinct project image for every supported locale", () => {
    const images = Object.values(LANDING_DEMO_IMAGES);
    expect(images).toHaveLength(5);
    expect(new Set(images).size).toBe(images.length);
    expect(images.every((image) => image.startsWith("/brand/landing-demo-") && image.endsWith(".png"))).toBe(true);
  });

  it("shows a different editing scenario in every locale", () => {
    const projects = Object.values(LANDING_DEMO_COPY).map((copy) => copy.project);
    const requests = Object.values(LANDING_DEMO_COPY).map((copy) => copy.ask);
    expect(new Set(projects).size).toBe(projects.length);
    expect(new Set(requests).size).toBe(requests.length);
  });
});
