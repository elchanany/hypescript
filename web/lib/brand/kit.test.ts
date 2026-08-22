import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BRAND_KIT_VERSION,
  BrandKv,
  brandKitKey,
  brandKitPrompt,
  createBrandKit,
  deleteBrandKit,
  getActiveBrandKit,
  getActiveBrandKitId,
  getBrandKit,
  listBrandKits,
  normalizeAssets,
  normalizeColors,
  normalizeHexColor,
  sanitizeBrandKit,
  fetchBrandKitFromCloud,
  setActiveBrandKit,
  syncActiveBrandKitToCloud,
  summarizeBrandKit,
  updateBrandKit,
  BRAND_ACTIVE_KEY,
  BRAND_KITS_KEY,
} from "./kit";

// ─── in-memory kv adapter (no IndexedDB in node) ─────────────────────────────
function memoryKv(): BrandKv {
  const map = new Map<string, unknown>();
  return {
    get: async (key) => (map.has(key) ? (map.get(key) as any) : null),
    set: async (key, value) => void map.set(key, value),
  };
}

const blob = (type = "image/png") => new Blob([new Uint8Array([1, 2, 3])], { type });

function sampleAssets() {
  return [
    { id: "ba-logo", name: "logo.png", role: "logo" as const, mime: "image/png", width: 400, height: 120, blob: blob() },
    { id: "ba-ref", name: "style-guide.jpg", role: "reference" as const, mime: "image/jpeg", blob: blob("image/jpeg") },
  ];
}

describe("normalization", () => {
  it("normalizes and dedupes hex colors to lowercase #rrggbb", () => {
    expect(normalizeHexColor("#FFF")).toBe("#ffffff");
    expect(normalizeHexColor("a1b2C3")).toBe("#a1b2c3");
    expect(normalizeHexColor("#123456")).toBe("#123456");
    expect(normalizeHexColor("not-a-color")).toBeNull();
    expect(normalizeHexColor(42)).toBeNull();
    expect(normalizeHexColor("#ffff")).toBeNull(); // 4 digits → invalid
    expect(normalizeColors(["#FFF", "#ffffff", "#123456", "bogus", "", 7])).toEqual(["#ffffff", "#123456"]);
  });

  it("keeps only Blob-backed assets and fills missing ids/roles", () => {
    const assets = normalizeAssets([
      { id: "a1", name: "ok.png", role: "logo", mime: "image/png", blob: blob() },
      { name: "no-id", blob: blob("image/png") },
      { id: "bad", name: "no-blob.png", role: "reference", mime: "image/png" },
      { id: "weird", name: "x.png", role: "something" as any, blob: blob("image/png") },
      null,
      "nope",
    ]);
    expect(assets).toHaveLength(3);
    expect(assets.map((a) => a.id)).toContain("a1");
    expect(assets.some((a) => a.name === "no-id")).toBe(true);
    expect(assets.find((a) => a.name === "no-id")!.id).toBeTruthy();
    expect(assets.find((a) => a.name === "x.png")!.role).toBe("reference"); // unknown role → reference
  });
});

describe("CRUD + active behavior", () => {
  it("creates, lists, reads and updates a kit", async () => {
    const kv = memoryKv();
    const kit = await createBrandKit({ organization: "בית הכנסת", tagline: "שיעורים יומיים", colors: ["#FFfFff", "#0077cc"], assets: sampleAssets() }, kv);
    expect(kit.version).toBe(BRAND_KIT_VERSION);
    expect(kit.colors).toEqual(["#ffffff", "#0077cc"]);
    expect((await listBrandKits(kv)).map((e) => e.id)).toEqual([kit.id]);
    const read = await getBrandKit(kit.id, kv);
    expect(read?.organization).toBe("בית הכנסת");
    expect(read?.assets).toHaveLength(2);
    expect(read?.assets[0].blob instanceof Blob).toBe(true);

    const updated = await updateBrandKit(kit.id, { organization: "עמותת רב" }, kv);
    expect(updated?.organization).toBe("עמותת רב");
    expect(updated?.colors).toEqual(["#ffffff", "#0077cc"]);
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(kit.updatedAt);
    expect((await listBrandKits(kv))[0].organization).toBe("עמותת רב");
  });

  it("activate → get active; delete active falls back to first remaining kit", async () => {
    const kv = memoryKv();
    const a = await createBrandKit({ organization: "א" }, kv);
    const b = await createBrandKit({ organization: "ב" }, kv);
    expect(await getActiveBrandKitId(kv)).toBeNull();
    expect(await setActiveBrandKit(a.id, kv)).toBe(a.id);
    expect(await getActiveBrandKitId(kv)).toBe(a.id);
    expect((await getActiveBrandKit(kv))?.id).toBe(a.id);

    // deleting a non-active kit keeps the active one
    await deleteBrandKit(b.id, kv);
    expect(await getActiveBrandKitId(kv)).toBe(a.id);

    // deleting the active kit falls back to the first remaining kit (b is gone → empty → null)
    await deleteBrandKit(a.id, kv);
    expect(await getActiveBrandKitId(kv)).toBeNull();
    expect(await getActiveBrandKit(kv)).toBeNull();
    expect(await listBrandKits(kv)).toEqual([]);
  });

  it("deleting the active kit with remaining kits activates a fallback", async () => {
    const kv = memoryKv();
    const a = await createBrandKit({ organization: "א" }, kv);
    const b = await createBrandKit({ organization: "ב" }, kv);
    await setActiveBrandKit(b.id, kv);
    await deleteBrandKit(b.id, kv);
    expect(await getActiveBrandKitId(kv)).toBe(a.id);
    expect((await getActiveBrandKit(kv))?.id).toBe(a.id);
  });

  it("setActiveBrandKit rejects unknown ids", async () => {
    const kv = memoryKv();
    await createBrandKit({ organization: "א" }, kv);
    expect(await setActiveBrandKit("missing", kv)).toBeNull();
  });

  it("deleteBrandKit returns false for unknown ids", async () => {
    const kv = memoryKv();
    expect(await deleteBrandKit("missing", kv)).toBe(false);
  });
});

describe("malformed / legacy data", () => {
  it("repairs a stale active pointer when the kit is gone", async () => {
    const kv = memoryKv();
    const a = await createBrandKit({ organization: "א" }, kv);
    await kv.set(BRAND_ACTIVE_KEY, a.id);
    await kv.set(brandKitKey(a.id), null); // simulate out-of-band deletion
    expect(await getActiveBrandKit(kv)).toBeNull();
    expect(await getActiveBrandKitId(kv)).toBeNull(); // pointer repaired (cleared)
  });

  it("ignores a malformed kit index (not an array)", async () => {
    const kv = memoryKv();
    await kv.set(BRAND_KITS_KEY, "garbage");
    expect(await listBrandKits(kv)).toEqual([]);
    // index repaired on next write
    const a = await createBrandKit({ organization: "א" }, kv);
    expect(await listBrandKits(kv)).toHaveLength(1);
    expect((await listBrandKits(kv))[0].id).toBe(a.id);
  });

  it("sanitizeBrandKit drops unusable records and recovers the rest", () => {
    expect(sanitizeBrandKit(null)).toBeNull();
    expect(sanitizeBrandKit("str")).toBeNull();
    expect(sanitizeBrandKit({})).toBeNull();
    expect(sanitizeBrandKit({ id: "x" })).toBeNull(); // missing organization
    const legacy = {
      id: "k1",
      organization: "  ארגון  ",
      colors: ["#abc", "#ABC", "junk"],
      assets: [{ id: "l1", name: "l.png", role: "logo", mime: "image/png", blob: blob() }, { id: "l2", blob: "not-a-blob" }],
      writingGuidelines: 42, // wrong type → recovered as ""
    };
    const kit = sanitizeBrandKit(legacy)!;
    expect(kit.version).toBe(BRAND_KIT_VERSION);
    expect(kit.organization).toBe("ארגון");
    expect(kit.colors).toEqual(["#aabbcc"]);
    expect(kit.assets).toHaveLength(1);
    expect(kit.assets[0].id).toBe("l1");
    expect(kit.writingGuidelines).toBe("");
  });

  it("tolerates assets stored without a version / with odd fields", async () => {
    const kv = memoryKv();
    const a = await createBrandKit({ organization: "א", assets: sampleAssets() }, kv);
    await kv.set(brandKitKey(a.id), { ...a, version: undefined, colors: "not-an-array" as any });
    const read = await getBrandKit(a.id, kv);
    expect(read?.id).toBe(a.id);
    expect(read?.colors).toEqual([]);
    expect(read?.assets).toHaveLength(2);
  });
});

describe("summary redaction (LLM boundary)", () => {
  it("never leaks blobs, object URLs or data URLs in summaries", async () => {
    const kv = memoryKv();
    const kit = await createBrandKit({ organization: "עמותה", colors: ["#123456"], assets: sampleAssets() }, kv);
    const summary = summarizeBrandKit(kit);
    const json = JSON.stringify(summary);
    expect(json).not.toContain("blob");
    expect(json).not.toContain("data:");
    expect(json).not.toContain("http");
    expect(summary.assets[0]).toEqual({ id: "ba-logo", name: "logo.png", role: "logo", mime: "image/png", width: 400, height: 120 });
    expect(summary.colors).toEqual(["#123456"]);
    expect(summary.organization).toBe("עמותה");
  });

  it("builds a concise LLM prompt from the summary (no binaries)", async () => {
    const kv = memoryKv();
    const kit = await createBrandKit({
      organization: "ארגון הדוגמה",
      tagline: "סלוגן קצר",
      colors: ["#ff0000"],
      writingGuidelines: "לכתוב בעברית פשוטה",
      assets: sampleAssets(),
    }, kv);
    const prompt = brandKitPrompt(summarizeBrandKit(kit));
    expect(prompt).toContain("ארגון הדוגמה");
    expect(prompt).toContain("סלוגן קצר");
    expect(prompt).toContain("#ff0000");
    expect(prompt).toContain("לכתוב בעברית פשוטה");
    expect(prompt).toContain("id=ba-logo");
    expect(prompt).toContain("logo.png");
    expect(prompt).toContain("400×120");
    expect(prompt).toContain("לוגו"); // role label
    expect(prompt).toContain("ייחוס"); // reference role label
    expect(prompt).not.toContain("blob");
  });
});

// סנכרון ענן: מה שנשבר קודם היה שקט מוחלט — הכתיבה נכשלה, ה-catch בלע, והקורא
// לא ידע. הבדיקות האלה נועלות את ההתנהגות החדשה: תוצאה אמיתית, ובלי לזרוק.
describe("brand kit cloud sync", () => {
  // שתי הפונקציות יוצאות מוקדם כשאין window (הן רצות בדפדפן בלבד). כאן מריצים
  // אותן בסביבת node, ולכן window מזויף — אחרת הבדיקה הייתה "עוברת" בלי לבדוק כלום.
  beforeEach(() => vi.stubGlobal("window", {}));
  afterEach(() => vi.unstubAllGlobals());

  it("reports failure instead of swallowing it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
    const kv = memoryKv();
    const kit = await createBrandKit({ organization: "מוסד" }, kv);
    await expect(syncActiveBrandKitToCloud(kit)).resolves.toBe(false);
  });

  it("reports success when the server accepted it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200 })));
    const kv = memoryKv();
    const kit = await createBrandKit({ organization: "מוסד" }, kv);
    await expect(syncActiveBrandKitToCloud(kit)).resolves.toBe(true);
  });

  it("never throws when the network is down — local editing must keep working", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const kv = memoryKv();
    const kit = await createBrandKit({ organization: "מוסד" }, kv);
    await expect(syncActiveBrandKitToCloud(kit)).resolves.toBe(false);
  });

  it("returns null rather than a half-empty kit when the cloud has nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ brandKit: null }) })));
    await expect(fetchBrandKitFromCloud()).resolves.toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ brandKit: {} }) })));
    await expect(fetchBrandKitFromCloud()).resolves.toBeNull();
  });

  it("returns the stored kit when there is one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, json: async () => ({ brandKit: { organization: "מוסד", colors: ["#112233"] } }),
    })));
    await expect(fetchBrandKitFromCloud()).resolves.toMatchObject({ organization: "מוסד" });
  });

  it("treats a failed read as no kit, so it can never wipe the local one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502 })));
    await expect(fetchBrandKitFromCloud()).resolves.toBeNull();
  });
});
