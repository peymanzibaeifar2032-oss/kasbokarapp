// 1.16.1: the site's design image reaches the appointment card, is cached offline, and «نمایش طرح» opens it.
// /api/save responses are TEST FIXTURES (synthetic image + fake booking). No production data is used.
import { applyTestLicense, pocketRoot } from "./pocket-license-fixture.mjs";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = resolve(pocketRoot());
const shots = "/workspace/screenshots";
await mkdir(shots, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, "." + new URL(req.url, "http://local").pathname);
    if (!path.startsWith(root + "/")) throw Error();
    res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2" }[extname(path)] || "application/octet-stream");
    res.end(await readFile(path));
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const design = "data:image/jpeg;base64," + (await readFile("scripts/fixtures/pocket-test-design.jpg")).toString("base64");

const parts = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
const pick = (t) => parts.find((p) => p.type === t).value;
const today = `${pick("year").replace(/\D/g, "")}-${pick("month")}-${pick("day")}`;
const key = "d" + "1".repeat(32);
const booking = (serverId, name, photoKey) => ({
  serverId, day: today, time: "11:00", name, phone: "09120000001", style: "فاین لاین", placement: "ساعد",
  phone2: "", instagram: "", sizeCm: "10x6", requestType: "new", idea: "", priceMinToman: 4000000, priceMaxToman: 0,
  depositToman: 0, paidToman: 0, sessionCount: 1, sessionMinutes: 120, bookingId: "", slotStart: new Date().toISOString(), photoKey,
});
const account = { isOwner: true, canViewAppStats: false, accountEmail: "owner-qa@example.invalid" };
const ownerExport = { schemaVersion: 2, account, bookings: [booking("req-design-1", "مشتری طرح‌دار", key), booking("req-design-2", "طرح ناموجود", "d" + "2".repeat(32))] };

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const verdict = { ok: false, checks: {}, errors: [] };

async function open(width, respond, storageState) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, ...(storageState ? { storageState } : {}) });
  await context.addInitScript(() => {
    if (!localStorage.getItem("pocket.app.settings.v1")) {
      localStorage.setItem("pocket.app.settings.v1", JSON.stringify({ locale: "fa", professionId: "tattoo_artist", onboarded: true }));
      localStorage.setItem("pocket.account.email.v1", "owner-qa@example.invalid");
    }
  });
  await applyTestLicense(context);
  const page = await context.newPage();
  const calls = [];
  page.on("pageerror", (e) => verdict.errors.push(`${width}: ${e.message}`));
  await page.route("**/api/**", async (route) => {
    const body = route.request().postDataJSON?.() ?? null;
    calls.push(body);
    const [status, json] = respond(body?.type, body?.payload);
    if (status === "abort") return route.abort();
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
  });
  await page.goto(base + "/index.html");
  await page.getByRole("tablist").waitFor();
  await page.waitForTimeout(600);
  return { context, page, calls };
}
const ownerReply = (type, payload) => {
  if (type === "studioPocketAccess") return [200, { account, appStats: null }];
  if (type === "studioPocketExport") return [200, ownerExport];
  if (type === "studioPocketPhotos") {
    const ids = payload.ids;
    return [200, { photos: ids.includes("req-design-1") ? [{ serverId: "req-design-1", key, data: design }] : [], missing: ids.filter((i) => i !== "req-design-1"), deferred: [] }];
  }
  return [200, { ok: true }];
};
const noOverflow = async (page, label) => {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(o.sw <= o.w + 1, `${label}: horizontal overflow ${o.sw} > ${o.w}`);
};

try {
  // 1) Owner download at 390: card shows the design, viewer opens, zoom toggles, close works.
  const { context, page, calls } = await open(390, ownerReply);
  await page.getByRole("button", { name: "دانلود نوبت‌ها" }).click();
  await page.locator(".pocket-design-thumb img").first().waitFor({ timeout: 20000 });
  const natural = await page.locator(".pocket-design-thumb img").first().evaluate((img) => img.naturalWidth);
  assert.ok(natural > 100, "design image decoded");
  await page.getByText("این نوبت در سایت طرح دارد").waitFor();
  const photoCalls = calls.filter((c) => c?.type === "studioPocketPhotos");
  assert.ok(photoCalls.length >= 1 && photoCalls.every((c) => c.payload.ids.length <= 4));
  await page.getByText(/طرح روی گوشی ذخیره شد/).waitFor();
  await page.screenshot({ path: `${shots}/pocket-1.16.1-design-card-390.png`, fullPage: true });
  await page.getByRole("button", { name: "نمایش طرح" }).first().click();
  const viewer = page.getByRole("dialog");
  await viewer.waitFor();
  const box = await viewer.locator("img").boundingBox();
  assert.ok(box && box.height > 400, "full-screen image");
  await page.screenshot({ path: `${shots}/pocket-1.16.1-design-viewer-390.png` });
  await viewer.getByRole("button", { name: "بزرگ‌نمایی" }).click();
  const zoomed = await viewer.locator("img").boundingBox();
  assert.ok(zoomed.width > box.width * 1.5, "zoom enlarges");
  await page.screenshot({ path: `${shots}/pocket-1.16.1-design-zoom-390.png` });
  await viewer.getByRole("button", { name: "بستن" }).click();
  await viewer.waitFor({ state: "detached" });
  verdict.checks.owner390 = { photoCalls: photoCalls.length, natural, viewerHeight: Math.round(box.height), zoomWidth: Math.round(zoomed.width) };

  // 2) Offline after sync: the network is gone, the design still shows from the phone cache.
  const state = await context.storageState();
  await page.route("**/api/**", (route) => route.abort());
  await page.reload();
  await page.getByRole("tablist").waitFor();
  await page.locator(".pocket-design-thumb img").first().waitFor({ timeout: 10000 });
  verdict.checks.offlineCache = true;
  await context.close();

  // 3) Widths: card + viewer fit without horizontal overflow (cache carried over via a fresh sync).
  for (const width of [320, 360, 390, 820]) {
    const v = await open(width, ownerReply, state);
    await v.page.getByRole("button", { name: "دانلود نوبت‌ها" }).click();
    await v.page.locator(".pocket-design-thumb img").first().waitFor({ timeout: 20000 });
    await v.page.waitForTimeout(400);
    await noOverflow(v.page, `card-${width}`);
    await v.page.screenshot({ path: `${shots}/pocket-1.16.1-design-card-${width}.png`, fullPage: true });
    await v.page.getByRole("button", { name: "نمایش طرح" }).first().click();
    await v.page.getByRole("dialog").waitFor();
    await noOverflow(v.page, `viewer-${width}`);
    const bar = await v.page.locator(".pocket-viewer-bar").boundingBox();
    assert.ok(bar.width <= width + 1, `viewer bar fits ${width}`);
    await v.page.screenshot({ path: `${shots}/pocket-1.16.1-design-viewer-${width}.png` });
    await v.context.close();
    verdict.checks[`width${width}`] = true;
  }

  // 4) Not owner (export refused): no photo request is ever made, no design UI.
  {
    const v = await open(390, (type) => type === "studioPocketAccess" ? [200, { account: { isOwner: false, canViewAppStats: false, accountEmail: "x@example.invalid" }, appStats: null }] : [403, { error: "forbidden" }]);
    await v.page.getByRole("button", { name: "دانلود نوبت‌ها" }).click();
    await v.page.locator(".pocket-banner").first().waitFor();
    await v.page.waitForTimeout(800);
    assert.equal(v.calls.filter((c) => c?.type === "studioPocketPhotos").length, 0);
    assert.equal(await v.page.locator(".pocket-design").count(), 0);
    verdict.checks.nonOwnerNoPhotos = true;
    await v.context.close();
  }

  // 5) Photo server error: appointments still saved, card shows the graceful "not saved yet" note.
  {
    const v = await open(390, (type, payload) => type === "studioPocketPhotos" ? [500, { error: "x" }] : ownerReply(type, payload));
    await v.page.getByRole("button", { name: "دانلود نوبت‌ها" }).click();
    await v.page.getByText("مشتری طرح‌دار").first().waitFor();
    await v.page.getByText(/بعضی طرح‌ها نرسید/).waitFor({ timeout: 15000 });
    assert.ok((await v.page.getByText("این نوبت در سایت طرح دارد").count()) >= 1);
    verdict.checks.photoErrorGraceful = true;
    await v.context.close();
  }
  assert.deepEqual(verdict.errors, []);
  verdict.ok = true;
} catch (error) {
  verdict.errors.push(String(error?.stack || error));
} finally {
  await browser.close();
  server.close();
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/pocket-design-photo.json", JSON.stringify(verdict, null, 2));
  console.log(JSON.stringify(verdict, null, 2));
  if (!verdict.ok) process.exitCode = 1;
}
