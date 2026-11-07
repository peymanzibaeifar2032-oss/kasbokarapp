// 1.14.4 visual smoke on the packaged offline bundle. All data below is a SYNTHETIC TEST FIXTURE (not owner data).
import { applyTestLicense, pocketRoot } from "./pocket-license-fixture.mjs";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = resolve(pocketRoot());
const shots = process.env.POCKET_ROOT ? "/workspace/screenshots/pocket-1.15.0" : "/workspace/screenshots/pocket-1.14.4";
await mkdir(shots, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, "." + new URL(req.url, "http://local").pathname);
    if (!path.startsWith(root + "/")) throw Error();
    res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2" }[extname(path)] || "application/octet-stream");
    res.end(await readFile(path));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const parts = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
const pick = (t) => parts.find((p) => p.type === t).value;
const today = `${pick("year").replace(/\D/g, "")}-${pick("month")}-${pick("day")}`;
const [jy, jm] = today.split("-").map(Number);
const account = { isOwner: true, canViewAppStats: false, accountEmail: "owner-qa@example.invalid" };
const fixture = {
  schemaVersion: 2, account,
  bookings: [{ serverId: "req-qa-1", day: today, time: "11:00", name: "مشتری نمونه", phone: "09120000001", style: "فاین لاین", placement: "ساعد",
    phone2: "", instagram: "", sizeCm: "10x6", requestType: "new", idea: "", priceMinToman: 4000000, priceMaxToman: 5000000,
    depositToman: 500000, paidToman: 1500000, sessionCount: 1, sessionMinutes: 180, bookingId: "bk-qa-1", slotStart: new Date().toISOString() }],
  trainees: [{ id: "srv-trainee-qa", serverId: "qa", name: "هنرجوی نمونه", phone: "", honorific: "", sessionGoal: 10, sessionsDone: 3, feeTotalToman: 900000, paidToman: 400000, debtToman: 500000, notes: "", startedOn: today, createdAt: new Date().toISOString() }],
  traineePayments: [{ id: "srv-tpay-qa", traineeId: "srv-trainee-qa", amountToman: 400000, paidOn: today, note: "" }],
  finance: { status: "ok", generatedAt: new Date().toISOString(), truncated: false,
    records: [
      { serverId: "pay:qa-p1", kind: "income", day: today, amountToman: 1500000, title: "مشتری نمونه", note: "", category: "واریز مشتری", ref: "" },
      { serverId: "exp:qa-e1", kind: "expense", day: `${jy}-${String(jm).padStart(2, "0")}-01`, amountToman: 700000, title: "کرایه نمونه", note: "", category: "کرایه سالن", ref: "" }],
    summary: { incomeToman: 1500000, expenseToman: 700000, balanceToman: 800000, openReceivableToman: 2500000 },
    currentMonth: { jy, jm, paid: 1500000, remainingMonth: 2500000, remainingAll: 2500000, salonCost: 700000, lifeCost: 0, expenseTotal: 700000, salonProfit: 800000, leftover: 800000 } },
};
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const result = { ok: false, widths: {}, errors: [] };
try {
  for (const [w, h] of [[320, 640], [360, 760], [390, 844], [820, 1180]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    await ctx.addInitScript(() => {
      localStorage.setItem("pocket.app.settings.v1", JSON.stringify({ locale: "fa", professionId: "tattoo_artist", onboarded: true }));
      localStorage.setItem("pocket.account.email.v1", "qa@example.invalid");
    });
    await applyTestLicense(ctx);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => result.errors.push(`${w}: ${e.message}`));
    await page.route("**/api/**", (route) => {
      const type = route.request().postDataJSON?.()?.type;
      const json = type === "studioPocketExport" ? fixture : type === "studioPocketAccess" ? { account, appStats: null } : { ok: true };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(json) });
    });
    await page.goto(base + "/index.html");
    await page.getByRole("tablist").waitFor();
    await page.getByRole("button", { name: "دانلود نوبت‌ها" }).click();
    await page.getByText(/بارگذاری کامل شد/).first().waitFor();
    await page.waitForTimeout(4500); // let toasts clear for clean shots
    const checks = {};
    for (const [tab, label] of [["calendar", /تقویم/], ["cash", /صندوق/], ["trainees", /هنرجو|کارآموز/], ["backup", /پشتیبان/]]) {
      await page.getByRole("tab", { name: label }).click();
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      const navOk = await page.evaluate(() => [...document.querySelectorAll(".pocket-tab")].every((t) => {
        const r = t.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5 && r.height >= 44;
      }));
      const clipped = await page.evaluate(() => [...document.querySelectorAll("button, .pocket-card, .pocket-stat")].filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.left < -0.5 || r.right > innerWidth + 0.5); }).map((el) => el.textContent.trim().slice(0, 40)));
      assert.deepEqual(clipped, [], `${w} ${tab} elements outside viewport`);
      assert.ok(overflow <= 0, `${w} ${tab} horizontal overflow ${overflow}px`);
      assert.ok(navOk, `${w} ${tab} bottom nav not fully visible / too small`);
      const path = `${shots}/${tab}-${w}.png`;
      await page.screenshot({ path });
      checks[tab] = { overflow, navOk, path };
    }
    // content assertions: real state from the (synthetic) sync is rendered
    await page.getByRole("tab", { name: /صندوق/ }).click();
    assert.ok((await page.getByTestId("cash-server-summary").innerText()).includes("۸۰۰,۰۰۰"));
    await page.getByRole("tab", { name: /تقویم/ }).click();
    const money = await page.getByTestId("booking-money").first().innerText();
    assert.ok(money.includes("۱,۵۰۰,۰۰۰") && money.includes("۲,۵۰۰,۰۰۰"));
    await page.screenshot({ path: `${shots}/calendar-full-${w}.png`, fullPage: true });
    result.widths[w] = checks;
    await ctx.close();
  }
  assert.deepEqual(result.errors, []);
  result.ok = true;
} catch (e) {
  result.failure = String(e?.stack || e);
} finally {
  await writeFile(`${shots}/verdict.json`, JSON.stringify(result, null, 2));
  await browser.close(); server.close();
}
console.log(JSON.stringify({ ok: result.ok, failure: result.failure, errors: result.errors }, null, 2));
if (!result.ok) process.exit(1);
