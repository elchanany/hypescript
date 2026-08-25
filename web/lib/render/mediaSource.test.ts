import { describe, expect, it } from "vitest";
import {
  isUsableSource,
  isJunkPayload,
  materializeSource,
  resolveMediaSource,
  type CloudAssetResolver,
  type UrlFetcher,
} from "./mediaSource";
import type { MediaAsset } from "@/lib/editor/model";

// ---------------------------------------------------------------------------
// isUsableSource
// ---------------------------------------------------------------------------
describe("isUsableSource", () => {
  it("rejects null/undefined", () => {
    expect(isUsableSource(null)).toBe(false);
    expect(isUsableSource(undefined)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isUsableSource("")).toBe(false);
  });

  it("accepts non-empty string", () => {
    expect(isUsableSource("https://example.com/video.mp4")).toBe(true);
  });

  it("rejects empty File", () => {
    expect(isUsableSource(new File([], "empty.mp4", { type: "video/mp4" }))).toBe(false);
  });

  it("accepts non-empty File", () => {
    const f = new File([new Uint8Array(1024)], "video.mp4", { type: "video/mp4" });
    expect(isUsableSource(f)).toBe(true);
  });

  it("rejects empty Blob", () => {
    expect(isUsableSource(new Blob([]))).toBe(false);
  });

  it("accepts non-empty Blob", () => {
    expect(isUsableSource(new Blob([new Uint8Array(256)]))).toBe(true);
  });

  it("rejects empty Uint8Array", () => {
    expect(isUsableSource(new Uint8Array(0))).toBe(false);
  });

  it("accepts non-empty Uint8Array", () => {
    expect(isUsableSource(new Uint8Array(1))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isJunkPayload
// ---------------------------------------------------------------------------
describe("isJunkPayload", () => {
  it("rejects tiny Blob (< 8 bytes)", () => {
    const tiny = new Blob([new Uint8Array(4)]);
    expect(isJunkPayload(tiny)).toBe(true);
  });

  it("accepts Blob >= 8 bytes", () => {
    const ok = new Blob([new Uint8Array(16)]);
    expect(isJunkPayload(ok)).toBe(false);
  });

  it("rejects tiny File (< 8 bytes)", () => {
    const tiny = new File([new Uint8Array(4)], "t.mp4", { type: "video/mp4" });
    expect(isJunkPayload(tiny)).toBe(true);
  });

  it("rejects short non-URL string", () => {
    expect(isJunkPayload("hi")).toBe(true);
  });

  it("accepts valid small binary string (>= 8, not HTML/JSON)", () => {
    expect(isJunkPayload("\\x00\\x00\\x00\\x1cftyp")).toBe(false);
  });

  it("rejects HTML body string (starts with '<')", () => {
    const html = "<!DOCTYPE html>" + "x".repeat(20);
    expect(isJunkPayload(html)).toBe(true);
  });

  it("rejects JSON body string (starts with '{')", () => {
    const json = '{"error":"not found"}' + "x".repeat(20);
    expect(isJunkPayload(json)).toBe(true);
  });

  it("rejects JSON array body string (starts with '[')", () => {
    const arr = '[{"id":1}]' + "x".repeat(20);
    expect(isJunkPayload(arr)).toBe(true);
  });

  it("accepts valid URL string even when short", () => {
    const url = "https://r2.example.com/asset/abc123/download?token=xyz";
    expect(isJunkPayload(url)).toBe(false);
  });

  it("accepts blob: URL string", () => {
    expect(isJunkPayload("blob:http://localhost:3000/abc-123")).toBe(false);
  });

  it("rejects tiny Uint8Array", () => {
    expect(isJunkPayload(new Uint8Array(4))).toBe(true);
  });

  it("accepts valid small Uint8Array (>= 8, non-HTML/JSON start)", () => {
    const arr = new Uint8Array(10);
    arr[0] = 0x00;
    expect(isJunkPayload(arr)).toBe(false);
  });

  it("rejects Uint8Array starting with '<' (0x3C)", () => {
    const arr = new Uint8Array(1024);
    arr[0] = 0x3c; // '<'
    expect(isJunkPayload(arr)).toBe(true);
  });

  it("rejects Uint8Array starting with '{' (0x7B)", () => {
    const arr = new Uint8Array(1024);
    arr[0] = 0x7b; // '{'
    expect(isJunkPayload(arr)).toBe(true);
  });

  it("rejects Uint8Array starting with '[' (0x5B)", () => {
    const arr = new Uint8Array(1024);
    arr[0] = 0x5b; // '['
    expect(isJunkPayload(arr)).toBe(true);
  });

  it("accepts valid MP4-like Uint8Array (starts with ftyp box)", () => {
    const arr = new Uint8Array(1024);
    arr[0] = 0x00; // typical MP4 box size prefix
    arr[4] = 0x66; // 'f'
    arr[5] = 0x74; // 't'
    arr[6] = 0x79; // 'y'
    arr[7] = 0x70; // 'p'
    expect(isJunkPayload(arr)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveMediaSource
// ---------------------------------------------------------------------------
function makeAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "m1",
    name: "test.mp4",
    kind: "video",
    file: new File([], "test.mp4", { type: "video/mp4" }),
    duration: 10,
    url: "",
    ...overrides,
  };
}

const resolveCloudUrl: CloudAssetResolver = async (id) =>
  `https://cloud.example.com/${id}/download?token=abc123`;

describe("resolveMediaSource", () => {
  it("prefers non-empty local File over cloud and url", async () => {
    const file = new File([new Uint8Array(2048)], "local.mp4", { type: "video/mp4" });
    const asset = makeAsset({ file, cloudAssetId: "ca1", url: "https://stale-url" });
    const result = await resolveMediaSource({ asset, resolveCloudUrl });
    expect(result).toBe(file);
  });

  it("falls back to cloud URL when file is empty", async () => {
    const asset = makeAsset({
      file: new File([], "empty.mp4", { type: "video/mp4" }),
      cloudAssetId: "ca1",
      url: "",
    });
    const result = await resolveMediaSource({ asset, resolveCloudUrl });
    expect(result).toBe("https://cloud.example.com/ca1/download?token=abc123");
  });

  it("falls back to asset.url when file is empty and no cloudAssetId", async () => {
    const asset = makeAsset({
      file: new File([], "empty.mp4", { type: "video/mp4" }),
      url: "https://blob.example.com/video.mp4",
    });
    const result = await resolveMediaSource({ asset, resolveCloudUrl });
    expect(result).toBe("https://blob.example.com/video.mp4");
  });

  it("skips cloud URL that returns junk (HTML)", async () => {
    const junkResolver: CloudAssetResolver = async () =>
      "<!DOCTYPE html><html><body>403</body></html>" + "x".repeat(600);
    const asset = makeAsset({
      file: new File([], "empty.mp4", { type: "video/mp4" }),
      cloudAssetId: "ca1",
      url: "https://blob.example.com/video.mp4",
    });
    const result = await resolveMediaSource({ asset, resolveCloudUrl: junkResolver });
    expect(result).toBe("https://blob.example.com/video.mp4");
  });

  it("skips cloud URL that returns junk (tiny)", async () => {
    const tinyResolver: CloudAssetResolver = async () => "short";
    const asset = makeAsset({
      file: new File([], "empty.mp4", { type: "video/mp4" }),
      cloudAssetId: "ca1",
      url: "https://blob.example.com/video.mp4",
    });
    const result = await resolveMediaSource({ asset, resolveCloudUrl: tinyResolver });
    expect(result).toBe("https://blob.example.com/video.mp4");
  });

  it("throws Hebrew error when no source is available", async () => {
    const asset = makeAsset({
      file: new File([], "empty.mp4", { type: "video/mp4" }),
      url: "",
    });
    await expect(resolveMediaSource({ asset, resolveCloudUrl }))
      .rejects.toThrow(/חסר מקור לרינדור.*test\.mp4/);
  });

  it("handles cloud resolver error gracefully and falls to url", async () => {
    const failingResolver: CloudAssetResolver = async () => {
      throw new Error("network error");
    };
    const asset = makeAsset({
      file: new File([], "empty.mp4", { type: "video/mp4" }),
      cloudAssetId: "ca1",
      url: "https://blob.example.com/video.mp4",
    });
    const result = await resolveMediaSource({ asset, resolveCloudUrl: failingResolver });
    expect(result).toBe("https://blob.example.com/video.mp4");
  });

  it("throws when cloud fails and url is empty", async () => {
    const failingResolver: CloudAssetResolver = async () => {
      throw new Error("fail");
    };
    const asset = makeAsset({
      file: new File([], "empty.mp4", { type: "video/mp4" }),
      cloudAssetId: "ca1",
      url: "",
    });
    await expect(resolveMediaSource({ asset, resolveCloudUrl: failingResolver }))
      .rejects.toThrow(/חסר מקור לרינדור/);
  });

  it("strict priority: non-empty File wins over cloud URL and asset.url", async () => {
    const file = new File([new Uint8Array(1024)], "local.mp4", { type: "video/mp4" });
    const asset = makeAsset({ file, cloudAssetId: "ca1", url: "https://fallback.example.com/v.mp4" });
    const result = await resolveMediaSource({ asset, resolveCloudUrl });
    expect(result).toBe(file);
  });

  it("strict priority: cloud URL wins over asset.url when file is empty", async () => {
    const asset = makeAsset({
      file: new File([], "empty.mp4", { type: "video/mp4" }),
      cloudAssetId: "ca1",
      url: "https://fallback.example.com/v.mp4",
    });
    const result = await resolveMediaSource({ asset, resolveCloudUrl });
    expect(result).toBe("https://cloud.example.com/ca1/download?token=abc123");
  });

  it("accepts valid small binary blob (>= 8 bytes)", async () => {
    const smallBinary = new File([new Uint8Array([0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70])], "tiny.mp4", { type: "video/mp4" });
    const asset = makeAsset({ file: smallBinary, url: "" });
    const result = await resolveMediaSource({ asset, resolveCloudUrl });
    expect(result).toBe(smallBinary);
  });

  it("rejects HTML/JSON bytes in Uint8Array", () => {
    const htmlBytes = new Uint8Array(100);
    htmlBytes[0] = 0x3c; // '<'
    expect(isJunkPayload(htmlBytes)).toBe(true);

    const jsonBytes = new Uint8Array(100);
    jsonBytes[0] = 0x7b; // '{'
    expect(isJunkPayload(jsonBytes)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// materializeSource
// ---------------------------------------------------------------------------
describe("materializeSource", () => {
  const noopFetcher: UrlFetcher = async () => new Uint8Array(0);

  it("returns Uint8Array directly", async () => {
    const arr = new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70]);
    const result = await materializeSource(arr, noopFetcher);
    expect(result).toBe(arr);
  });

  it("materializes Blob via arrayBuffer", async () => {
    const bytes = new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70]);
    const blob = new Blob([bytes]);
    const result = await materializeSource(blob, noopFetcher);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBe(8);
    expect(Array.from(result)).toEqual(Array.from(bytes));
  });

  it("materializes File via arrayBuffer", async () => {
    const bytes = new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70]);
    const file = new File([bytes], "test.mp4", { type: "video/mp4" });
    const result = await materializeSource(file, noopFetcher);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBe(8);
  });

  it("calls injected fetcher for string URLs and returns fetched bytes", async () => {
    const fetched = new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70]);
    const fetcher: UrlFetcher = async (url) => {
      expect(url).toBe("https://cloud.example.com/v.mp4?token=abc");
      return fetched;
    };
    const result = await materializeSource("https://cloud.example.com/v.mp4?token=abc", fetcher);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual(Array.from(fetched));
  });

  it("never returns URL text — fetched bytes are always used", async () => {
    const url = "https://cloud.example.com/video.mp4?token=secret123";
    let fetchCalled = false;
    const fetcher: UrlFetcher = async () => {
      fetchCalled = true;
      return new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70]);
    };
    const result = await materializeSource(url, fetcher);
    expect(fetchCalled).toBe(true);
    expect(result).toBeInstanceOf(Uint8Array);
    // The result must NOT be the URL string bytes
    const urlBytes = new TextEncoder().encode(url);
    expect(result.byteLength).not.toBe(urlBytes.byteLength);
  });

  it("throws Hebrew error for < 8 bytes with label", async () => {
    const tiny = new Uint8Array(3);
    await expect(materializeSource(tiny, noopFetcher, "my-clip.mp4"))
      .rejects.toThrow(/my-clip.mp4.*3 בתים/);
  });

  it("throws Hebrew error for < 8 bytes without label", async () => {
    const tiny = new Uint8Array(2);
    await expect(materializeSource(tiny, noopFetcher))
      .rejects.toThrow(/קובץ.*2 בתים/);
  });

  it("throws Hebrew error for HTML bytes", async () => {
    const html = new Uint8Array(100);
    html[0] = 0x3c; // '<'
    await expect(materializeSource(html, noopFetcher, "bad.html"))
      .rejects.toThrow(/bad\.html.*HTML\/JSON/);
  });

  it("throws Hebrew error for JSON bytes ({)", async () => {
    const json = new Uint8Array(100);
    json[0] = 0x7b; // '{'
    await expect(materializeSource(json, noopFetcher))
      .rejects.toThrow(/HTML\/JSON/);
  });

  it("throws Hebrew error for JSON bytes ([)", async () => {
    const arr = new Uint8Array(100);
    arr[0] = 0x5b; // '['
    await expect(materializeSource(arr, noopFetcher))
      .rejects.toThrow(/HTML\/JSON/);
  });

  it("fetcher returning ArrayBuffer is converted to Uint8Array", async () => {
    const buf = new ArrayBuffer(8);
    new Uint8Array(buf).set([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70]);
    const fetcher: UrlFetcher = async () => buf;
    const result = await materializeSource("https://example.com/video.mp4", fetcher);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBe(8);
  });

  it("valid MP4-like bytes pass validation", async () => {
    const mp4 = new Uint8Array([0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70]);
    const result = await materializeSource(mp4, noopFetcher);
    expect(result).toBe(mp4);
  });

  it("Blob < 8 bytes throws", async () => {
    const tiny = new Blob([new Uint8Array(4)]);
    await expect(materializeSource(tiny, noopFetcher, "tiny.mp4"))
      .rejects.toThrow(/ריק או פגום.*4 בתים/);
  });

  it("Blob starting with HTML bytes throws", async () => {
    const htmlBlob = new Blob([new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50])]);
    await expect(materializeSource(htmlBlob, noopFetcher))
      .rejects.toThrow(/HTML\/JSON/);
  });
});
