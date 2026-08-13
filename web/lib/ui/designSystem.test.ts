import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name.startsWith(".next")) return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("חוקת העיצוב", () => {
  it("משתמשת ב-Rhea, Phosphor ו-RTL בתצורת shadcn", () => {
    const config = JSON.parse(readFileSync(join(root, "components.json"), "utf8"));
    expect(config.style).toBe("base-rhea");
    expect(config.iconLibrary).toBe("phosphor");
    expect(config.rtl).toBe(true);
    expect(config.tailwind.baseColor).toBe("mauve");
  });

  it("לא משאירה ייבואי Lucide בקוד המוצר", () => {
    const offenders = sourceFiles(root).filter((file) =>
      !file.endsWith("designSystem.test.ts") && readFileSync(file, "utf8").includes("lucide-react"),
    );
    expect(offenders).toEqual([]);
  });

  it("מגדירה טוקנים סמנטיים, Geist ותמיכה בהפחתת תנועה", () => {
    const css = readFileSync(join(root, "app", "globals.css"), "utf8");
    expect(css).toContain("--font: var(--font-geist-sans)");
    expect(css).toContain("--primary: var(--accent)");
    expect(css).toContain("--sidebar: var(--panel)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
