#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.GUIDE_URL || "http://127.0.0.1:8080/studio/guide?export=1";
const OUT = "/workspace/public/studio-guide";

mkdirSync(OUT, { recursive: true });
mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({ args: ["--font-render-hinting=none"] });
const page = await browser.newPage({
  viewport: { width: 1200, height: 1800 },
  deviceScaleFactor: 2,
});
await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const cards = page.locator("[data-guide-card]");
const count = await cards.count();
if (count < 1) {
  console.error(JSON.stringify({ ok: false, error: "no guide cards rendered" }));
  await browser.close();
  process.exit(1);
}

const slugs = [];
for (let i = 0; i < count; i++) {
  const card = cards.nth(i);
  const slug = (await card.getAttribute("data-guide-card")) || `card-${i + 1}`;
  slugs.push(slug);
  const dest = `${OUT}/${slug}.png`;
  await card.screenshot({ path: dest, type: "png" });
  await card.screenshot({ path: `/workspace/screenshots/studio-guide-${slug}.png`, type: "png" });
}

await browser.close();
console.log(JSON.stringify({ ok: true, count, slugs, out: OUT }));
