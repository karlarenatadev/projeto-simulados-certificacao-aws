import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePwa = path.join(root, "src", "frontend", "pwa");
const publicDir = path.join(root, "public");

describe("PWA source and generated contract", () => {
  test("keeps critical PWA artifacts source-driven", () => {
    for (const file of ["sw.js", "manifest.json", "404.html", ".nojekyll"]) {
      expect(fs.existsSync(path.join(sourcePwa, file))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, file))).toBe(true);
    }
  });

  test("manifest is relative and points to a generated local icon", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, "manifest.json"), "utf8"));
    expect(manifest.start_url).toBe("./index.html");
    expect(manifest.scope).toBe("./");
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith("./")).toBe(true);
      expect(fs.existsSync(path.resolve(publicDir, icon.src))).toBe(true);
    }
  });

  test("Service Worker protects API responses and precaches Exam Tips", () => {
    const sw = fs.readFileSync(path.join(publicDir, "sw.js"), "utf8");
    expect(sw).not.toContain("__CACHE_VERSION__");
    expect(sw).toContain("./dicas-prova.html");
    expect(sw).toContain("./data/exam-tips.json");
    expect(sw).toContain('url.pathname.includes("/api/")');
    expect(sw).toContain("new URL(self.registration.scope).pathname");
    expect(sw).toContain("startsWith(CACHE_PREFIX)");
  });
});
