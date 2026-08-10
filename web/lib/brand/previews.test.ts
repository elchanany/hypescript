import { describe, expect, it, vi } from "vitest";
import { previewsForAssets, revokeStalePreviews } from "./previews";

const url = (n: number) => `blob:mock-${n}`;

function makeSpy() {
  const revoked: string[] = [];
  const revoke = vi.fn((u: string) => revoked.push(u));
  return { revoked, revoke };
}

describe("revokeStalePreviews", () => {
  it("revokes exactly the URLs whose id is not in next, once each", () => {
    const { revoke, revoked } = makeSpy();
    const next = revokeStalePreviews(
      { a: url(1), b: url(2), c: url(3) },
      { a: url(9), c: url(3) }, // b removed, a replaced, c kept
      revoke,
    );
    expect(revoked.sort()).toEqual([url(2)]); // only b — a/c remain valid
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(next).toEqual({ a: url(9), c: url(3) }); // returns next unchanged
  });

  it("revokes everything when next is empty", () => {
    const { revoke, revoked } = makeSpy();
    revokeStalePreviews({ a: url(1), b: url(2) }, {}, revoke);
    expect(revoked.sort()).toEqual([url(1), url(2)]);
  });

  it("revokes nothing when next keeps all ids", () => {
    const { revoke } = makeSpy();
    revokeStalePreviews({ a: url(1) }, { a: url(1) }, revoke);
    expect(revoke).not.toHaveBeenCalled();
  });

  it("ignores empty/invalid entries defensively", () => {
    const { revoke, revoked } = makeSpy();
    revokeStalePreviews({ a: "", b: "" as unknown as string } as Record<string, string>, {}, revoke);
    expect(revoke).not.toHaveBeenCalled();
    expect(revoked).toEqual([]);
  });
});

describe("previewsForAssets", () => {
  const blob = (n: number) => new Blob([new Uint8Array([n])], { type: "image/png" });

  it("allocates URLs for new asset ids and keeps existing ones", () => {
    const existing = { a: url(1) };
    const next = previewsForAssets([{ id: "a", blob: blob(1) }, { id: "b", blob: blob(2) }], existing);
    expect(next.a).toBe(url(1)); // kept, not re-allocated
    expect(next.b).toMatch(/^blob:/);
    expect(Object.keys(next).sort()).toEqual(["a", "b"]);
  });

  it("drops ids whose asset disappeared", () => {
    const next = previewsForAssets([{ id: "b", blob: blob(2) }], { a: url(1), b: url(2) });
    expect(next).toEqual({ b: url(2) });
  });

  it("combined with revokeStalePreviews releases removed urls exactly once", () => {
    const { revoke, revoked } = makeSpy();
    const current = { a: url(1), b: url(2) };
    const next = previewsForAssets([{ id: "b", blob: blob(2) }], current);
    const result = revokeStalePreviews(current, next, revoke);
    expect(result).toEqual({ b: url(2) });
    expect(revoked).toEqual([url(1)]);
  });
});
