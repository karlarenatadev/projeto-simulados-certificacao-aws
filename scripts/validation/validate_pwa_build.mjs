import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const sourceDir = path.join(root, "src", "frontend", "pwa");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

for (const file of ["sw.js", "manifest.json", "404.html", ".nojekyll"]) {
  assert(
    fs.existsSync(path.join(sourceDir, file)),
    `PWA source is missing: src/frontend/pwa/${file}`,
  );
  assert(
    fs.existsSync(path.join(publicDir, file)),
    `Build artifact is missing: ${file}`,
  );
}

const manifest = JSON.parse(read(path.join(publicDir, "manifest.json")));
assert(
  manifest.start_url === "./index.html",
  "Manifest start_url must remain relative",
);
assert(manifest.scope === "./", "Manifest scope must remain relative");
assert(
  Array.isArray(manifest.icons) && manifest.icons.length > 0,
  "Manifest must declare an icon",
);

for (const icon of manifest.icons) {
  assert(
    !/^https?:/i.test(icon.src),
    `Manifest icon must be local: ${icon.src}`,
  );
  const iconPath = path.resolve(publicDir, icon.src);
  assert(
    iconPath.startsWith(`${publicDir}${path.sep}`),
    `Manifest icon escapes public/: ${icon.src}`,
  );
  assert(
    fs.existsSync(iconPath),
    `Manifest icon is missing after build: ${icon.src}`,
  );
}

const serviceWorker = read(path.join(publicDir, "sw.js"));
assert(
  !serviceWorker.includes("__CACHE_VERSION__"),
  "Service Worker cache version was not generated",
);
assert(
  serviceWorker.includes("./dicas-prova.html"),
  "Dicas page is not in the PWA precache",
);
assert(
  serviceWorker.includes("./data/exam-tips.json"),
  "Exam tips dataset is not in the PWA precache",
);
assert(
  serviceWorker.includes('url.pathname.includes("/api/")'),
  "API requests are not explicitly excluded from cache",
);
assert(
  serviceWorker.includes("startsWith(CACHE_PREFIX)"),
  "Cache cleanup is not scoped to the application prefix",
);
assert(
  read(path.join(publicDir, "validation", "valid.html")).includes(
    'src="../js/pwa/registerServiceWorker.js',
  ),
  "Validation shell must resolve the shared PWA registrar from its subdirectory",
);

for (const file of [
  "dicas-prova.html",
  "js/examTipsPage.js",
  "js/recommendations/examTips.js",
  "data/exam-tips.json",
]) {
  assert(
    fs.existsSync(path.join(publicDir, file)),
    `Dicas artifact is missing: ${file}`,
  );
}

console.log("PWA BUILD VALIDATION");
console.log("Artifacts: sw.js, manifest.json, 404.html, .nojekyll");
console.log(
  "Dicas: page, controller, recommendation module and dataset present",
);
console.log("Manifest: relative scope/start_url and local icon validated");
console.log(
  "Service Worker: deterministic version, Dicas precache and API exclusion validated",
);
