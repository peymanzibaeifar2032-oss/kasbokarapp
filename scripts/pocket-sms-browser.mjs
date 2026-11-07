import { applyTestLicense, pocketRoot } from "./pocket-license-fixture.mjs";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = resolve(pocketRoot());
const out = resolve("artifacts/qa-1.15.1");
await mkdir(out, { recursive: true });
await mkdir("/workspace/screenshots", { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, "." + new URL(req.url, "http://local").pathname);
    if (!path.startsWith(root + "/")) throw Error();
    const bytes = await readFile(path);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".woff2": "font/woff2",
      }[extname(path)] || "application/octet-stream",
    );
    res.end(bytes);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
await applyTestLicense(context);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/**", (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }),
);
const screenshot = async (name) => {
  const path = `/workspace/screenshots/pocket-1.14.4-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
};
const download = async (label, name) => {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: label, exact: true }).click();
  const result = await event;
  await result.saveAs(`${out}/${name}`);
  return result;
};
const shots = [];
const shot = async (name) => { const p = `/workspace/screenshots/pocket-1.15.2/${name}.png`; await page.screenshot({ path: p, fullPage: true }); shots.push(p); };
await mkdir("/workspace/screenshots/pocket-1.15.2", { recursive: true });
const textOf = async (scope) => { const box = scope.getByTestId("sms-text"); for (let i = 0; i < 50; i++) { const v = await box.inputValue(); if (v) return v; await page.waitForTimeout(100); } return ""; };
const waitText = async (scope, pred) => { const box = scope.getByTestId("sms-text"); let v = ""; for (let i = 0; i < 50; i++) { v = await box.inputValue(); if (pred(v)) return v; await page.waitForTimeout(100); } return v; };
const decodeSms = (href) => decodeURIComponent(href.split(/[?&]body=/)[1] || "");
try {
  await page.goto(base + "/index.html");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  await page.getByRole("textbox", { name: "جستجوی شغل" }).fill("تاتو");
  await page.locator("button").filter({ hasText: /تاتو/ }).first().click();
  await page.getByRole("button", { name: "شروع", exact: true }).click();
  await page.getByPlaceholder("name@email.com").fill("qa@example.invalid");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  await page.waitForTimeout(400);
  for (const w of [320, 360, 390, 820]) { await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(150);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(ov <= 1, `overflow ${w}: ${ov}`); await shot(`home-empty-${w}`); }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "ثبت نوبت همین روز", exact: true }).click();
  await page.getByRole("textbox", { name: "اسم مشتری", exact: true }).fill("سارا آزمایشی");
  await page.getByRole("textbox", { name: "طرح", exact: true }).fill("خط ظریف");
  await page.getByRole("textbox", { name: "موبایل", exact: true }).fill("09120000000");
  await page.locator("input[type=time]").fill("14:30");
  await page.getByRole("textbox", { name: "قیمت به تومان", exact: true }).fill("۴۰۰۰۰۰۰");
  await page.getByRole("button", { name: "ذخیره", exact: true }).click();
  await page.waitForTimeout(400);
  await shot("home-booking-390");
  await page.getByTestId("sms-toggle").first().click();
  const choices = await page.locator("[data-sms]").count();
  assert.ok(choices >= 14, `choices ${choices}`);
  await page.locator('[data-sms="confirm"]').click();
  const text = await textOf(page);
  if (!text.includes("سارا آزمایشی") || /undefined|null|NaN/.test(text)) console.log("CONFIRM", JSON.stringify(text));
  assert.ok(text.includes("سارا آزمایشی") && !/undefined|null|NaN/.test(text), "confirm text");
  const href = await page.getByTestId("sms-open").getAttribute("href");
  assert.ok(href.startsWith("sms:"), href); assert.equal(decodeSms(href), text);
  await page.getByTestId("sms-text").fill(text + "\nتست");
  assert.equal(decodeSms(await page.getByTestId("sms-open").getAttribute("href")), text + "\nتست");
  await shot("sms-preview-390");
  // ---- 1.15.2 «ثبت واریز» on the booking card (synthetic, local only) ----
  const card = page.locator(".pocket-booking-card").filter({ hasText: "سارا آزمایشی" });
  await card.getByTestId("booking-pay-open").click();
  await card.getByTestId("booking-pay-amount").fill("abc");
  await card.getByTestId("booking-pay-save").click();
  await card.getByRole("alert").waitFor();
  await card.getByTestId("booking-pay-amount").fill("۵۰۰٬۰۰۰");
  await card.getByTestId("booking-pay-note").fill("بیعانه آزمایشی");
  await card.getByTestId("booking-pay-save").dblclick();
  await card.getByTestId("booking-local-paid").waitFor();
  const paidTxt = await card.getByTestId("booking-paid").innerText();
  const remTxt = await card.getByTestId("booking-remaining").innerText();
  assert.ok(paidTxt.includes("۵۰۰,۰۰۰") || paidTxt.includes("۵۰۰٬۰۰۰"), paidTxt);
  assert.ok(remTxt.includes("۳,۵۰۰,۰۰۰") || remTxt.includes("۳٬۵۰۰٬۰۰۰"), remTxt);
  await shot("booking-payment-390");
  await page.reload();
  await page.locator(".pocket-booking-card").filter({ hasText: "سارا آزمایشی" }).getByTestId("booking-local-paid").waitFor();
  const cashRows = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open("pocket-cash"); r.onsuccess = () => { const q = r.result.transaction("entries").objectStore("entries").getAll(); q.onsuccess = () => res(q.result); }; }));
  const pays = cashRows.filter((e) => e.bookingId);
  assert.equal(pays.length, 1, "double tap → exactly one cash row");
  assert.equal(pays[0].amountToman, 500000);
  // re-open composer after reload
  await page.getByTestId("sms-toggle").first().click();
  await page.getByTestId("all-appointments").click();
  await shot("all-appointments-390");
  // cash + trainees
  await page.locator(".pocket-hero-tile.is-cash").click(); await page.waitForTimeout(200); await shot("cash-390");
  await page.setViewportSize({ width: 320, height: 844 }); await shot("cash-320");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 1, "cash overflow 320");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".pocket-tabs").getByText("هنرجوها", { exact: true }).click(); await page.waitForTimeout(200);
  await page.getByRole("textbox", { name: "نام" }).first().fill("علی هنرجو");
  await page.getByPlaceholder("موبایل").first().fill("09120000001");
  await page.locator("form").first().locator("button[type=submit]").first().click();
  await page.waitForTimeout(300);
  await page.getByTestId("trainee-sms-toggle").first().click();
  await page.locator('[data-sms="trainee-joined"]').first().click();
  await page.waitForFunction(() => document.querySelector('[data-testid="sms-text"]')?.value, null, { timeout: 5000 }).catch(() => {});
  const tt = await page.getByTestId("sms-text").inputValue();
  assert.ok(tt.includes("علی") && !/undefined|null|NaN/.test(tt), "trainee text");
  assert.equal(decodeSms(await page.getByTestId("sms-open").getAttribute("href")), tt);
  await shot("trainees-390"); await page.setViewportSize({ width: 320, height: 844 }); await shot("trainees-320");
  // ---- referral club (synthetic cached snapshot shaped like the owner export) ----
  await page.evaluate(() => localStorage.setItem("pocket.referral.v1", JSON.stringify({ club: { status: "ok", generatedAt: "2026-11-07T09:00:00Z", truncated: false,
    settings: null, members: [{ id: "m1", name: "عضو آزمایشی", phone: "09120000009", code: "TEST-1", active: true, tier: "active", successful: 3, total: 4, rewards: [] }],
    outbox: [{ id: "o1", phone: "09120000009", body: "متن آماده سایت", referrerId: "m1" }] }, localSettings: null })));
  await page.reload();
  await page.locator(".pocket-tabs").getByText("پشتیبان", { exact: true }).click();
  await page.getByTestId("club-member").first().click();
  await page.getByTestId("club-sms").locator('[data-sms="club-booked"]').click();
  const club = await textOf(page.getByTestId("club-sms"));
  assert.equal(club, "یک معرفی موفق برای شما ثبت شد. اکنون ۳ معرفی موفق از ۱۰ معرفی دارید.\nکد عضویت شما: TEST-1");
  assert.equal(decodeSms(await page.getByTestId("club-sms").getByTestId("sms-open").getAttribute("href")), club);
  await page.getByTestId("club-sms").locator('[data-sms="club-code"]').click();
  assert.ok((await waitText(page.getByTestId("club-sms"), (v) => v.startsWith("سلام"))).startsWith("سلام عضو آزمایشی\nکد عضویت باشگاه مشتریان تو: TEST-1"));
  await page.getByTestId("club-settings-toggle").click();
  await page.locator('[data-field="smsBooked"]').fill("معرفی ثبت شد: {count}");
  await page.getByTestId("club-settings-save").click();
  await page.reload();
  await page.locator(".pocket-tabs").getByText("پشتیبان", { exact: true }).click();
  await page.getByTestId("club-member").first().click();
  await page.getByTestId("club-sms").locator('[data-sms="club-booked"]').click();
  assert.equal(await waitText(page.getByTestId("club-sms"), Boolean), "معرفی ثبت شد: ۳\nکد عضویت شما: TEST-1");
  await page.setViewportSize({ width: 360, height: 844 });
  await shot("club-sms-360");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, choices, shots }, null, 2));
} finally { await browser.close(); server.close(); }
