import fs from "node:fs";
import path from "node:path";

function copyDirIfExists(source, target) {
  if (!fs.existsSync(source)) {
    console.warn(`[postbuild] Skip missing path: ${source}`);
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
  console.log(`[postbuild] Copied: ${source} -> ${target}`);
}

const projectRoot = process.cwd();
const nextStatic = path.join(projectRoot, ".next", "static");
const standaloneStatic = path.join(projectRoot, ".next", "standalone", ".next", "static");
const publicDir = path.join(projectRoot, "public");
const standalonePublic = path.join(projectRoot, ".next", "standalone", "public");

copyDirIfExists(nextStatic, standaloneStatic);
copyDirIfExists(publicDir, standalonePublic);

console.log("[postbuild] Static files copied to standalone");
