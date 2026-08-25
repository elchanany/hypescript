import assert from "node:assert/strict";
import test from "node:test";
import { cloudAudioFilters, cloudVideoFilters, validWorkerLook } from "./render-filters.mjs";

test("cloud video filters preserve look, flips, fades and opacity", () => {
  const chain = cloudVideoFilters({
    flipX: true, flipY: true,
    look: "eq=contrast=1.200:saturation=0.700",
    visualFadeIn: 0.5, visualFadeOut: 0.8, opacity: 0.45,
  }, 4);
  assert.match(chain, /^hflip,vflip,eq=contrast=1\.200:saturation=0\.700,/);
  assert.match(chain, /fade=t=in:st=0:d=0\.500/);
  assert.match(chain, /fade=t=out:st=3\.200:d=0\.800/);
  assert.match(chain, /colorchannelmixer=rr=0\.450:gg=0\.450:bb=0\.450/);
  assert.match(chain, /format=yuv420p$/);
});

test("cloud audio filters preserve gain and normalize overlong fades", () => {
  const chain = cloudAudioFilters({ volume: 1.6, fadeIn: 9, fadeOut: 9 }, 2);
  assert.equal(chain, "volume=1.600,afade=t=in:st=0:d=1.000,afade=t=out:st=1.000:d=1.000");
});

test("worker rejects filter-graph injection characters", () => {
  assert.equal(validWorkerLook("eq=contrast=1.2,noise=alls=8:allf=t+u"), true);
  assert.equal(validWorkerLook("movie=secret;[x]"), false);
  assert.equal(cloudVideoFilters({ look: "movie=secret;[x]" }, 1), "format=yuv420p");
});
