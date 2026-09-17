import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { projectRoot } from "./with-app-env.mjs";

const script = join(projectRoot(), "scripts/align-smoke-cookie-jar.py");

function tmpFile(name, contents) {
  const dir = mkdtempSync(join(tmpdir(), "kasb-jar-"));
  const path = join(dir, name);
  writeFileSync(path, contents);
  return path;
}

test("maps Domain=.kasbokarapp.com Secure cookies onto http loopback", () => {
  const jar = tmpFile(
    "cookies.txt",
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
  const jar = tmpFile(
    "cookies.txt",
    ".kasbokarapp.com\tTRUE\t/\tTRUE\t1893456000\tkasbokar.session_token\tabc\n",
  );
  execFileSync("python3", [script, jar, "https://kasbokarapp.com"]);
  const out = readFileSync(jar, "utf8");
  assert.match(out, /kasbokarapp\.com\tFALSE\t\/\tTRUE\t1893456000\tkasbokar\.session_token\tabc/);
});

test("ingests Set-Cookie Domain=.kasbokarapp.com that curl would drop", () => {
  const jar = tmpFile("cookies.txt", "");
  const hdr = tmpFile(
    "headers.txt",
    [
      "HTTP/1.1 200 OK",
      "content-type: application/json",
      "set-cookie: kasbokar.session_token=abc; Path=/; Domain=.kasbokarapp.com; HttpOnly; Secure; SameSite=Lax",
      "set-cookie: kasbokar.session_data=def; Path=/; Domain=.kasbokarapp.com; HttpOnly; Secure",
      "",
    ].join("\r\n"),
  );
  execFileSync("python3", [script, "ingest", jar, "http://127.0.0.1:8080", hdr]);
  const out = readFileSync(jar, "utf8");
  assert.match(out, /127\.0\.0\.1\tFALSE\t\/\tFALSE\t.*kasbokar\.session_token\tabc/);
  const header = execFileSync("python3", [script, "header", jar], { encoding: "utf8" });
  assert.match(header, /kasbokar\.session_token=abc/);
  assert.match(header, /kasbokar\.session_data=def/);
  assert.doesNotMatch(header, /Domain=/);
});

test("clears expired Set-Cookie so logout drops the session", () => {
  const jar = tmpFile(
    "cookies.txt",
    "127.0.0.1\tFALSE\t/\tFALSE\t1893456000\tkasbokar.session_token\tabc\n",
  );
  const hdr = tmpFile(
    "headers.txt",
    "set-cookie: kasbokar.session_token=; Path=/; Domain=.kasbokarapp.com; Max-Age=0\n",
  );
  execFileSync("python3", [script, "ingest", jar, "http://127.0.0.1:8080", hdr]);
  const header = execFileSync("python3", [script, "header", jar], { encoding: "utf8" });
  assert.equal(header, "");
});
