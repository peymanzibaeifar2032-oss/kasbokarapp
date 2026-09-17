import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { projectRoot } from "./with-app-env.mjs";

const script = join(projectRoot(), "scripts/align-smoke-cookie-jar.py");

function writeJar(contents) {
  const dir = mkdtempSync(join(tmpdir(), "kasb-jar-"));
  const jar = join(dir, "cookies.txt");
  writeFileSync(jar, contents);
  return jar;
}

test("maps Domain=.kasbokarapp.com Secure cookies onto http loopback", () => {
  const jar = writeJar(
    [
      "# Netscape HTTP Cookie File",
      "#HttpOnly_.kasbokarapp.com\tTRUE\t/\tTRUE\t1893456000\tkasbokar.session_token\tabc",
      ".kasbokarapp.com\tTRUE\t/\tTRUE\t1893456000\tkasbokar.session_data\tdef",
      "",
    ].join("\n"),
  );
  execFileSync("python3", [script, jar, "http://127.0.0.1:8080"]);
  const out = readFileSync(jar, "utf8");
  assert.match(out, /#HttpOnly_127\.0\.0\.1\tFALSE\t\/\tFALSE\t1893456000\tkasbokar\.session_token\tabc/);
  assert.match(out, /127\.0\.0\.1\tFALSE\t\/\tFALSE\t1893456000\tkasbokar\.session_data\tdef/);
  assert.doesNotMatch(out, /kasbokarapp\.com/);
});

test("keeps Secure when smoke base is https", () => {
  const jar = writeJar(
    ".kasbokarapp.com\tTRUE\t/\tTRUE\t1893456000\tkasbokar.session_token\tabc\n",
  );
  execFileSync("python3", [script, jar, "https://kasbokarapp.com"]);
  const out = readFileSync(jar, "utf8");
  assert.match(out, /kasbokarapp\.com\tFALSE\t\/\tTRUE\t1893456000\tkasbokar\.session_token\tabc/);
});
