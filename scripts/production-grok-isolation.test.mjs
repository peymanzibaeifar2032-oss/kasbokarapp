import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { grokChromeEnabled, injectGrokPwaHead, shouldSkipGrokOverlay } from "./grok-pwa-shared.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("Production document shell has no Grok PWA identity and keeps GuideWidget", () => {
  const root = readFileSync(join(ROOT, "src/routes/__root.tsx"), "utf8");
  assert.doesNotMatch(root, /\/__grok\//);
  assert.doesNotMatch(root, /grok-app-builder/);
  assert.doesNotMatch(root, /PreviewHostBridge/);
  assert.match(root, /GuideWidget/);
  assert.match(root, /favicon\.svg/);
  assert.match(root, /og:title/);
  assert.match(root, /کسب‌وکار/);
});

test("kasbokar hosts and STANDALONE skip Grok overlay including /__grok/", () => {
  assert.equal(shouldSkipGrokOverlay("kasbokarapp.com"), true);
  assert.equal(shouldSkipGrokOverlay("www.kasbokarapp.com"), true);
  const prev = process.env.STANDALONE;
  process.env.STANDALONE = "true";
  try {
    assert.equal(grokChromeEnabled(), false);
    const html = injectGrokPwaHead(
      '<html><head><link rel="manifest" href="/__grok/manifest.webmanifest"><link rel="apple-touch-icon" href="/__grok/icon-180.png"><script src="https://grok.com/grok-app-builder/extensions.js" defer></script></head></html>',
      { host: "example.dev" },
    );
    assert.doesNotMatch(html, /extensions\.js/);
    assert.doesNotMatch(html, /\/__grok\//);
    assert.doesNotMatch(html, /grok-sandbox\.com/);
  } finally {
    if (prev === undefined) delete process.env.STANDALONE;
    else process.env.STANDALONE = prev;
  }
});

test("security-headers middleware remains; grok-pwa middleware has no Grok runtime", () => {
  const pwa = readFileSync(join(ROOT, "server/middleware/grok-pwa.ts"), "utf8");
  const sec = readFileSync(join(ROOT, "server/middleware/security-headers.ts"), "utf8");
  const vite = readFileSync(join(ROOT, "vite.config.ts"), "utf8");
  assert.match(sec, /X-Content-Type-Options/);
  assert.match(vite, /serverDir:\s*"\.\/server"/);
  assert.doesNotMatch(pwa, /grok-app-builder/);
  assert.doesNotMatch(pwa, /__grok/);
});
