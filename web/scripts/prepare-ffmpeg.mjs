import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "public", "ffmpeg");
const coreSource = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");
const workerSource = join(root, "node_modules", "@ffmpeg", "ffmpeg", "dist", "esm");

await mkdir(target, { recursive: true });
for (const name of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  await copyFile(join(coreSource, name), join(target, name));
}
// Serve the official ESM class-worker without letting Next/Webpack bundle its
// runtime `import(coreURL)`. Bundling that expression turns a valid blob/URL
// import into Webpack's empty context module ("Cannot find module 'blob:…'").
for (const name of ["worker.js", "const.js", "errors.js"]) {
  await copyFile(join(workerSource, name), join(target, name));
}
console.log("Prepared local FFmpeg core in public/ffmpeg");
