// Test-only: resolve the app's "@/..." alias and extensionless TS imports for node --experimental-strip-types.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("data:text/javascript," + encodeURIComponent(`
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const src = ${JSON.stringify(pathToFileURL(process.cwd() + "/src/").href)};
export async function resolve(spec, ctx, next) {
  let s = spec.startsWith("@/") ? src + spec.slice(2) : spec;
  if ((s.startsWith("file:") || s.startsWith(".")) && !/\\.[cm]?[jt]sx?$/.test(s)) {
    const base = new URL(s, ctx.parentURL);
    for (const ext of [".ts", ".tsx", "/index.ts"]) if (existsSync(fileURLToPath(base.href + ext))) { s = base.href + ext; break; }
  }
  return next(s, ctx);
}`), pathToFileURL("./"));
