import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

execFileSync(process.execPath, ["scripts/with-app-env.mjs", process.execPath, "node_modules/vite/bin/vite.js", "build", "--config", "vite.pocket.config.ts"], { stdio: "inherit" });
const testBuild = Boolean(process.env.POCKET_LICENSE_TEST_KEYS?.trim());
const out = testBuild ? "dist/pocket-offline-test" : "dist/pocket-offline";
const html = readFileSync(`${out}/pocket-offline.html`, "utf8")
  .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
  .replace(/<link rel="stylesheet" crossorigin /g, '<link rel="stylesheet" ');
// Test builds (with a throwaway test trust key) never reach public/ or the APK assets.
const targets = testBuild ? [out] : ["public/apps/pocket-offline", "android-tattoo-booking/app/src/debug/assets/pocket"];
for (const target of targets) {
  mkdirSync(target, { recursive: true });
  if (target !== out) cpSync(out, target, { recursive: true });
  writeFileSync(`${target}/index.html`, html);
}
