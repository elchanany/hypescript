// בדיקות יחידה למתאמי stock — נרמול תשובות, שגיאות מקודדות, רשימת hosts
// להורדה (SSRF) והגבלת per_page. fetch מדומה; אין רשת ואין מפתחות אמיתיים.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_STOCK_PER_PAGE,
  StockError,
  assertAllowedStockDownloadUrl,
  clampStockPerPage,
  searchStock,
} from "./providers";

const ENV_VARS = ["PEXELS_API_KEY", "PIXABAY_API_KEY", "UNSPLASH_ACCESS_KEY", "FREESOUND_API_KEY"];

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_VARS.map((k) => [k, process.env[k]]));
  for (const k of ENV_VARS) delete process.env[k];
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ENV_VARS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

function lastCall(mock: ReturnType<typeof stubFetch>): { url: string; headers: Headers } {
  const call = mock.mock.calls[mock.mock.calls.length - 1];
  return { url: String(call[0]), headers: new Headers((call[1] as RequestInit)?.headers) };
}

// --- פיקסטורות ריאליסטיות -------------------------------------------------

const PEXELS_VIDEO_FIXTURE = {
  videos: [
    {
      id: 8154966,
      duration: 21,
      url: "https://www.pexels.com/video/8154966/",
      image: "https://images.pexels.com/videos/8154966/pictures/preview-0.jpg",
      user: { name: "Taryn Elliott" },
      video_files: [
        { link: "https://videos.pexels.com/video-files/4k-clip.mp4", width: 3840, height: 2160 },
        { link: "https://videos.pexels.com/video-files/hd-clip.mp4", width: 1920, height: 1080 },
        { link: "https://videos.pexels.com/video-files/sd-clip.mp4", width: 960, height: 540 },
      ],
    },
  ],
};

const PEXELS_PHOTO_FIXTURE = {
  photos: [
    {
      id: 36717,
      width: 5760,
      height: 3840,
      alt: "green grass field near lake",
      photographer: "Pixabay",
      src: {
        original: "https://images.pexels.com/photos/36717/pexels-photo.jpg",
        medium: "https://images.pexels.com/photos/36717/pexels-photo.jpeg?auto=compress&h=350",
        tiny: "https://images.pexels.com/photos/36717/pexels-photo.jpeg?auto=compress&h=200",
      },
    },
  ],
};

const PIXABAY_PHOTO_FIXTURE = {
  hits: [
    {
      id: 459043,
      tags: "sunrise, mountain, landscape",
      previewURL: "https://cdn.pixabay.com/photo/2014/08/26/thumb.jpg",
      webformatURL: "https://cdn.pixabay.com/photo/2014/08/26/web.jpg",
      largeImageURL: "https://cdn.pixabay.com/photo/2014/08/26/large.jpg",
      imageWidth: 4288,
      imageHeight: 2848,
      user: "schmidti",
    },
  ],
};

const PIXABAY_VIDEO_FIXTURE = {
  hits: [
    {
      id: 112233,
      duration: 12,
      user: "videofactory",
      videos: {
        large: { url: "https://cdn.pixabay.com/video/2023/large.mp4", width: 1920, height: 1080 },
        small: { url: "https://cdn.pixabay.com/video/2023/small.mp4", width: 1280, height: 720 },
        tiny: { url: "https://cdn.pixabay.com/video/2023/tiny.mp4", width: 960, height: 540 },
      },
    },
  ],
};

const UNSPLASH_FIXTURE = {
  results: [
    {
      id: "ILip77SbmQE",
      alt_description: "white clouds and blue sky",
      description: null,
      width: 4000,
      height: 6000,
      urls: {
        raw: "https://images.unsplash.com/photo-1503023345310?ixid=x",
        full: "https://images.unsplash.com/photo-1503023345310?q=80&fm=jpg",
        regular: "https://images.unsplash.com/photo-1503023345310?q=80&w=1080",
        small: "https://images.unsplash.com/photo-1503023345310?q=80&w=400",
        thumb: "https://images.unsplash.com/photo-1503023345310?q=80&w=200",
      },
      user: { name: "David Marcu" },
    },
  ],
};

const FREESOUND_FIXTURE = {
  count: 1,
  results: [
    {
      id: 654321,
      name: "birds_chirping.wav",
      duration: 18.4,
      license: "http://creativecommons.org/licenses/by/3.0/",
      username: "soundcollector",
      previews: {
        "preview-hq-mp3": "https://cdn.freesound.org/previews/654/654321_1234-hq.mp3",
        "preview-lq-mp3": "https://cdn.freesound.org/previews/654/654321_1234-lq.mp3",
      },
    },
  ],
};

// --- נרמול לפי ספק ---------------------------------------------------------

describe("searchStock — נרמול תשובות Pexels", () => {
  it("וידאו: בוחר קובץ HD הגבוה שאינו עולה על 1920 וממפה שדות", async () => {
    process.env.PEXELS_API_KEY = "test-pexels-key";
    const mock = stubFetch(() => jsonResponse(PEXELS_VIDEO_FIXTURE));

    const { items } = await searchStock({ provider: "pexels", kind: "video", query: "nature" });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      provider: "pexels",
      kind: "video",
      id: "8154966",
      downloadUrl: "https://videos.pexels.com/video-files/hd-clip.mp4",
      previewUrl: "https://images.pexels.com/videos/8154966/pictures/preview-0.jpg",
      width: 1920,
      height: 1080,
      durationSec: 21,
      author: "Taryn Elliott",
      license: "Pexels License",
      attribution: "Taryn Elliott @ Pexels",
    });
    const call = lastCall(mock);
    expect(call.url).toContain("api.pexels.com/videos/search");
    expect(call.headers.get("Authorization")).toBe("test-pexels-key");
  });

  it("תמונה: original להורדה, medium לתצוגה, alt לכותרת", async () => {
    process.env.PEXELS_API_KEY = "test-pexels-key";
    stubFetch(() => jsonResponse(PEXELS_PHOTO_FIXTURE));

    const { items } = await searchStock({ provider: "pexels", kind: "photo", query: "field" });

    expect(items[0]).toMatchObject({
      provider: "pexels",
      kind: "photo",
      id: "36717",
      title: "green grass field near lake",
      downloadUrl: "https://images.pexels.com/photos/36717/pexels-photo.jpg",
      previewUrl: "https://images.pexels.com/photos/36717/pexels-photo.jpeg?auto=compress&h=350",
      width: 5760,
      height: 3840,
      author: "Pixabay",
      license: "Pexels License",
    });
  });
});

describe("searchStock — נרמול תשובות Pixabay", () => {
  it("תמונה: largeImageURL להורדה, tags לכותרת, key ב-query", async () => {
    process.env.PIXABAY_API_KEY = "test-pixabay-key";
    const mock = stubFetch(() => jsonResponse(PIXABAY_PHOTO_FIXTURE));

    const { items } = await searchStock({ provider: "pixabay", kind: "photo", query: "sunrise" });

    expect(items[0]).toMatchObject({
      provider: "pixabay",
      kind: "photo",
      id: "459043",
      title: "sunrise, mountain, landscape",
      downloadUrl: "https://cdn.pixabay.com/photo/2014/08/26/large.jpg",
      width: 4288,
      author: "schmidti",
      license: "Pixabay Content License",
      attribution: "schmidti @ Pixabay",
    });
    const call = lastCall(mock);
    expect(call.url).toContain("pixabay.com/api/?key=test-pixabay-key");
    expect(call.url).toContain("safesearch=true");
  });

  it("וידאו: בוחר large וממפה משך", async () => {
    process.env.PIXABAY_API_KEY = "test-pixabay-key";
    stubFetch(() => jsonResponse(PIXABAY_VIDEO_FIXTURE));

    const { items } = await searchStock({ provider: "pixabay", kind: "video", query: "waves" });

    expect(items[0]).toMatchObject({
      kind: "video",
      downloadUrl: "https://cdn.pixabay.com/video/2023/large.mp4",
      durationSec: 12,
      license: "Pixabay Content License",
    });
  });
});

describe("searchStock — נרמול תשובות Unsplash", () => {
  it("raw להורדה, small לתצוגה, Client-ID בכותרת", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-unsplash-key";
    const mock = stubFetch(() => jsonResponse(UNSPLASH_FIXTURE));

    const { items } = await searchStock({ provider: "unsplash", kind: "photo", query: "sky" });

    expect(items[0]).toMatchObject({
      provider: "unsplash",
      kind: "photo",
      id: "ILip77SbmQE",
      title: "white clouds and blue sky",
      downloadUrl: "https://images.unsplash.com/photo-1503023345310?ixid=x",
      previewUrl: "https://images.unsplash.com/photo-1503023345310?q=80&w=400",
      author: "David Marcu",
      license: "Unsplash License",
      attribution: "David Marcu @ Unsplash",
    });
    const call = lastCall(mock);
    expect(call.url).toContain("api.unsplash.com/search/photos");
    expect(call.headers.get("Authorization")).toBe("Client-ID test-unsplash-key");
  });
});

describe("searchStock — נרמול תשובות Freesound", () => {
  it("הורדה מ-preview MP3, רישיון CC BY מה-API, משך מעוגל", async () => {
    process.env.FREESOUND_API_KEY = "test-freesound-token";
    const mock = stubFetch(() => jsonResponse(FREESOUND_FIXTURE));

    const { items } = await searchStock({ provider: "freesound", kind: "audio", query: "birds" });

    expect(items[0]).toMatchObject({
      provider: "freesound",
      kind: "audio",
      id: "654321",
      title: "birds_chirping.wav",
      downloadUrl: "https://cdn.freesound.org/previews/654/654321_1234-hq.mp3",
      previewUrl: "https://cdn.freesound.org/previews/654/654321_1234-hq.mp3",
      durationSec: 18.4,
      author: "soundcollector",
      license: "CC BY 3.0",
      attribution: "soundcollector @ Freesound",
    });
    const call = lastCall(mock);
    expect(call.url).toContain("freesound.org/apiv2/search/text/");
    expect(call.url).toContain("token=test-freesound-token");
  });

  it("CC0 ממופה כשה-API מחזיר zero", async () => {
    process.env.FREESOUND_API_KEY = "test-freesound-token";
    stubFetch(() =>
      jsonResponse({
        results: [
          {
            ...FREESOUND_FIXTURE.results[0],
            id: 42,
            license: "http://creativecommons.org/publicdomain/zero/1.0/",
          },
        ],
      }),
    );
    const { items } = await searchStock({ provider: "freesound", kind: "audio", query: "rain" });
    expect(items[0].license).toBe("CC0 1.0");
  });
});

// --- env חסר / כשל מעלה / בקשה שגויה --------------------------------------

describe("searchStock — שגיאות", () => {
  it.each([
    ["pexels", "video", "PEXELS_API_KEY"],
    ["pixabay", "photo", "PIXABAY_API_KEY"],
    ["unsplash", "photo", "UNSPLASH_ACCESS_KEY"],
    ["freesound", "audio", "FREESOUND_API_KEY"],
  ])("%s בלי %s → stock_not_configured", async (provider, kind, varName) => {
    await expect(searchStock({ provider, kind, query: "x" })).rejects.toMatchObject({
      code: "stock_not_configured",
      message: expect.stringContaining(varName as string),
    });
  });

  it("upstream 500 → stock_search_failed (בלי דלף פרטים)", async () => {
    process.env.PEXELS_API_KEY = "test-pexels-key";
    stubFetch(() => new Response("boom", { status: 500 }));
    await expect(
      searchStock({ provider: "pexels", kind: "video", query: "x" }),
    ).rejects.toMatchObject({ code: "stock_search_failed" });
  });

  it("fetch שנזרק (רשת) → stock_search_failed", async () => {
    process.env.PIXABAY_API_KEY = "test-pixabay-key";
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(
      searchStock({ provider: "pixabay", kind: "photo", query: "x" }),
    ).rejects.toBeInstanceOf(StockError);
  });

  it.each([
    ["nope", "photo"],
    ["pexels", "audio"],
    ["unsplash", "video"],
    ["freesound", "video"],
  ])("ספק/סוג לא נתמך (%s/%s) → stock_bad_request", async (provider, kind) => {
    process.env.PEXELS_API_KEY = "test-pexels-key";
    await expect(searchStock({ provider, kind, query: "x" })).rejects.toMatchObject({
      code: "stock_bad_request",
    });
  });

  it("query ריק → stock_bad_request", async () => {
    process.env.PEXELS_API_KEY = "test-pexels-key";
    await expect(searchStock({ provider: "pexels", kind: "video", query: "   " })).rejects.toMatchObject({
      code: "stock_bad_request",
    });
  });
});

// --- per_page --------------------------------------------------------------

describe("clampStockPerPage — הגבלת per_page", () => {
  it("ערך ענק מוגבל ל-MAX_STOCK_PER_PAGE (24)", async () => {
    process.env.PEXELS_API_KEY = "test-pexels-key";
    const mock = stubFetch(() => jsonResponse(PEXELS_VIDEO_FIXTURE));
    await searchStock({ provider: "pexels", kind: "video", query: "x", perPage: 1000 });
    expect(lastCall(mock).url).toContain(`per_page=${MAX_STOCK_PER_PAGE}`);
  });

  it("ערך שלילי מוגבל ל-1, ו-NaN חוזר לברירת המחדל (12)", () => {
    expect(clampStockPerPage(999)).toBe(MAX_STOCK_PER_PAGE);
    expect(clampStockPerPage(-5)).toBe(1);
    expect(clampStockPerPage(Number.NaN)).toBe(12);
    expect(clampStockPerPage(undefined)).toBe(12);
  });
});

// --- רשימת hosts להורדה (SSRF) ---------------------------------------------

describe("assertAllowedStockDownloadUrl — רשימת hostnames סגורה", () => {
  it.each([
    ["pexels", "https://videos.pexels.com/video-files/x.mp4"],
    ["pexels", "https://images.pexels.com/photos/1/p.jpg"],
    ["pixabay", "https://cdn.pixabay.com/photo/a.jpg"],
    ["pixabay", "https://pixabay.com/get/gabc123.mp4"],
    ["unsplash", "https://images.unsplash.com/photo-1?w=800"],
    ["freesound", "https://cdn.freesound.org/previews/1-x.mp3"],
  ])("מאשר URL חוקי של %s", (provider, url) => {
    expect(() => assertAllowedStockDownloadUrl(provider as never, url)).not.toThrow();
  });

  it.each([
    ["unsplash", "https://evil.example/photo.jpg"],
    ["pexels", "https://api.pexels.com/v1/search"],
    ["pixabay", "https://pixabay.com/not-get/file.mp4"],
    ["freesound", "http://169.254.169.254/latest/meta-data"],
    ["freesound", "ftp://cdn.freesound.org/x.mp3"],
    ["pexels", "not a url at all"],
  ])("דוחה host/host-path/סכמה זרה (%s ← %s)", (provider, url) => {
    try {
      assertAllowedStockDownloadUrl(provider as never, url);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(StockError);
      expect((err as StockError).code).toBe("stock_bad_request");
    }
  });

  it("subdomain spoofing נדחה (attack.pexels.com אינו videos.pexels.com)", () => {
    expect(() =>
      assertAllowedStockDownloadUrl("pexels", "https://videos.pexels.com.attacker.io/x.mp4"),
    ).toThrow(StockError);
  });
});
