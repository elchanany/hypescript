import { describe, it, expect } from "vitest";
import { deleteClipRange, deleteClipsAt, intersectClipsWithSpeech, keepSourceRange } from "./clipFilter";
import { Clip } from "./model";

const c = (id: string, start: number, end: number, sourceId = "v1"): Clip => ({ id, sourceId, start, end });

describe("keepSourceRange", () => {
  it("keeps and trims overlapping clips", () => {
    const clips = [c("a", 0, 10), c("b", 20, 40), c("c", 50, 60)];
    const r = keepSourceRange(clips, 5, 25);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ start: 5, end: 10 });
    expect(r[1]).toMatchObject({ start: 20, end: 25 });
  });
});

describe("deleteClipsAt / deleteClipRange", () => {
  it("deletes many indices in one shot", () => {
    const clips = [c("a", 0, 1), c("b", 1, 2), c("c", 2, 3), c("d", 3, 4)];
    expect(deleteClipsAt(clips, [2, 4]).map((x) => x.id)).toEqual(["a", "c"]);
    expect(deleteClipRange(clips, 2, 4).map((x) => x.id)).toEqual(["a"]);
  });
});

describe("intersectClipsWithSpeech", () => {
  it("cuts silence only inside existing selection", () => {
    const clips = [c("sel", 0, 10)];
    const speech = [c("s1", 1, 3), c("s2", 5, 7), c("s3", 20, 30)];
    const r = intersectClipsWithSpeech(clips, speech, "v1");
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ start: 1, end: 3 });
    expect(r[1]).toMatchObject({ start: 5, end: 7 });
  });
});
