import { describe, expect, it } from "vitest";
import {
  cloudFailureReason, cloudSkipMessage, decideCloudRoute, renderRouteMessage,
  type CloudRouteInput,
} from "./renderRoute";

const ok: CloudRouteInput = {
  policyAllowsCloud: true,
  allMediaInCloud: true,
  uploadInFlight: false,
  hasTextOverlay: false,
  wantsBurnedCaptions: false,
  workerBurnsCaptions: false,
};

describe("decideCloudRoute", () => {
  it("allows the cloud when everything is ready", () => {
    expect(decideCloudRoute(ok)).toEqual({ eligible: true });
  });

  it("reports each blocker by name", () => {
    expect(decideCloudRoute({ ...ok, policyAllowsCloud: false }).reason).toBe("project_is_local");
    expect(decideCloudRoute({ ...ok, uploadInFlight: true }).reason).toBe("media_still_uploading");
    expect(decideCloudRoute({ ...ok, allMediaInCloud: false }).reason).toBe("media_not_in_cloud");
    expect(decideCloudRoute({ ...ok, hasTextOverlay: true }).reason).toBe("text_overlay_unsupported");
  });

  it("puts the blocker the user can fix first", () => {
    // גם ההעלאה רצה וגם חסרה מדיה בענן — ההודעה חייבת להיות "המתן להעלאה",
    // כי היא זו שמובילה לפעולה, ולא "המדיה לא בענן" שנשמע כמו תקלה.
    expect(decideCloudRoute({ ...ok, uploadInFlight: true, allMediaInCloud: false }).reason)
      .toBe("media_still_uploading");
  });

  it("blocks burned captions only while the deployed worker cannot burn them", () => {
    expect(decideCloudRoute({ ...ok, wantsBurnedCaptions: true, workerBurnsCaptions: false }).reason)
      .toBe("captions_unsupported");
    expect(decideCloudRoute({ ...ok, wantsBurnedCaptions: true, workerBurnsCaptions: true }))
      .toEqual({ eligible: true });
  });

  it("does not block on captions when the user did not ask to burn them", () => {
    expect(decideCloudRoute({ ...ok, wantsBurnedCaptions: false, workerBurnsCaptions: false }))
      .toEqual({ eligible: true });
  });
});

describe("renderRouteMessage", () => {
  it("says cloud only when it really is the cloud", () => {
    expect(renderRouteMessage("cloud").titleHe).toContain("בענן");
  });

  it("never claims the cloud while the work runs on the device", () => {
    const reasons = [
      "project_is_local", "media_still_uploading", "media_not_in_cloud",
      "text_overlay_unsupported", "captions_unsupported", "cloud_failed", "cloud_quota",
    ] as const;
    for (const reason of reasons) {
      const message = renderRouteMessage("device", reason);
      expect(message.titleHe).toContain("על המכשיר");
      expect(message.titleHe).not.toContain("בענן");
      expect(message.noteHe).toContain(cloudSkipMessage(reason));
    }
  });

  it("still explains itself when there is no specific reason", () => {
    const message = renderRouteMessage("device");
    expect(message.titleHe).toContain("על המכשיר");
    expect(message.noteHe.length).toBeGreaterThan(20);
  });
});

describe("cloudFailureReason", () => {
  it("separates a quota refusal from an outage, because the fix is different", () => {
    expect(cloudFailureReason(new Error("cloud_render_402:render_seconds_quota"))).toBe("cloud_quota");
    expect(cloudFailureReason(new Error("limit_reached"))).toBe("cloud_quota");
    expect(cloudFailureReason(new Error("fetch failed"))).toBe("cloud_failed");
    expect(cloudFailureReason(undefined)).toBe("cloud_failed");
  });
});
