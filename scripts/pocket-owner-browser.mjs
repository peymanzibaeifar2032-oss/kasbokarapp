// 1.14 owner-feature QA against the real generated offline bundle (public/apps/pocket-offline).
// /api/save responses are TEST FIXTURES that imitate the server contract; no production data is used.
import { applyTestLicense, pocketRoot } from "./pocket-license-fixture.mjs";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = resolve(pocketRoot());
const out = resolve("artifacts/qa-1.14.3");
await mkdir(out, { recursive: true });
await mkdir("/workspace/screenshots", { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, "." + new URL(req.url, "http://local").pathname);
    if (!path.startsWith(root + "/")) throw Error();
    const bytes = await readFile(path);
    res.setHeader("Content-Type", { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2" }[extname(path)] || "application/octet-stream");
    res.end(bytes);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const parts = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
const pick = (t) => parts.find((p) => p.type === t).value;
const today = `${pick("year").replace(/\D/g, "")}-${pick("month")}-${pick("day")}`;
const [jy, jm] = today.split("-").map(Number);
const ownerBooking = {
  serverId: "req-qa-1", day: today, time: "11:00", name: "مشتری آزمایشی سایت", phone: "09120000001",
  style: "فاین لاین", placement: "ساعد", phone2: "09350000002", instagram: "qa.ink", sizeCm: "10x6",
  requestType: "new", idea: "طرح گل آزمایشی", priceMinToman: 4000000, priceMaxToman: 5000000,
  depositToman: 500000, paidToman: 1500000, sessionCount: 1, sessionMinutes: 180, bookingId: "bk-qa-1",
  slotStart: new Date().toISOString(),
};
const finance = {
  status: "ok", generatedAt: new Date().toISOString(), truncated: false,
  records: [
    { serverId: "pay:qa-p1", kind: "income", day: today, amountToman: 1500000, title: "مشتری آزمایشی سایت", note: "", category: "واریز مشتری", ref: "فاین لاین · ساعد" },
    { serverId: "exp:qa-e1", kind: "expense", day: `${jy}-${String(jm).padStart(2, "0")}-01`, amountToman: 700000, title: "کرایه آزمایشی", note: "", category: "کرایه سالن", ref: "هزینهٔ ماهانهٔ سایت" },
  ],
  summary: { incomeToman: 1500000, expenseToman: 700000, balanceToman: 800000, openReceivableToman: 2500000 },
  currentMonth: { jy, jm, paid: 1500000, remainingMonth: 2500000, remainingAll: 2500000, salonCost: 700000, lifeCost: 0, expenseTotal: 700000, salonProfit: 800000, leftover: 800000 },
};
const stats = { installs: 4, downloads: 11, accounts: [{ email: "qa@example.invalid", devices: 1, lastSeenAt: new Date().toISOString() }], monthlyRevenue: [] };
const account = { isOwner: true, canViewAppStats: true, accountEmail: "owner-qa@example.invalid" };
const ownerExport = {
  schemaVersion: 2, account, bookings: [ownerBooking], finance, appStats: stats,
  trainees: [{ id: "srv-trainee-qa", serverId: "qa", name: "هنرجوی سایت", phone: "", honorific: "", sessionGoal: 10, sessionsDone: 3, feeTotalToman: 900000, paidToman: 400000, debtToman: 500000, notes: "", startedOn: today, createdAt: new Date().toISOString() }],
  traineePayments: [{ id: "srv-tpay-qa", traineeId: "srv-trainee-qa", amountToman: 400000, paidOn: today, note: "" }],
};

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const verdict = { ok: false, scenarios: {}, errors: [] };

async function scenario(name, { professionId, typedEmail, respond }) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(([p, e]) => {
    if (!localStorage.getItem("pocket.app.settings.v1")) {
      localStorage.setItem("pocket.app.settings.v1", JSON.stringify({ locale: "fa", professionId: p, onboarded: true }));
      localStorage.setItem("pocket.account.email.v1", e);
    }
  }, [professionId, typedEmail]);
  await applyTestLicense(context);
  const page = await context.newPage();
  const calls = [];
  page.on("pageerror", (e) => verdict.errors.push(`${name}: ${e.message}`));
  await page.route("**/api/**", async (route) => {
    const body = route.request().postDataJSON?.() ?? null;
    const type = body?.type || route.request().url();
    calls.push(type);
    const [status, json] = respond(type);
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
  });
  await page.goto(base + "/index.html");
  await page.getByRole("tablist").waitFor();
  await page.waitForTimeout(800);
  return { context, page, calls };
}
const shot = (page, n) => page.screenshot({ path: `/workspace/screenshots/pocket-1.14.4-${n}.png`, fullPage: true });
const statsHidden = async (page) => {
  assert.equal(await page.getByRole("tab", { name: "آمار اپلیکیشن" }).count(), 0);
  assert.equal(await page.getByText("آمار اپلیکیشن").count(), 0);
  assert.equal(await page.getByTestId("owner-badge").count(), 0);
};

try {
  // A: signed out, even with the real owner email typed offline → nothing owner-only.
  {
    const { context, page, calls } = await scenario("signed-out", {
      professionId: "tattoo_artist", typedEmail: "peyman.zibaeifar2032@gmail.com",
      respond: () => [401, { error: "لطفاً دوباره با ایمیل وارد شوید." }],
    });
    await statsHidden(page);
    await page.getByRole("tab", { name: /هنرجو|کارآموز/ }).click();
    assert.equal(await page.getByTestId("trainee-server-card").count(), 0);
    await page.getByRole("tab", { name: "تقویم" }).click();
    await page.getByRole("button", { name: "دانلود نوبت‌ها" }).click();
    await page.locator(".pocket-banner").first().waitFor();
    await statsHidden(page);
    await shot(page, "signed-out-hidden");
    verdict.scenarios.signedOut = { calls, hidden: true };
    await context.close();
  }
  // B: signed-in regular user → server says not owner.
  {
    const { context, page, calls } = await scenario("regular", {
      professionId: "tattoo_artist", typedEmail: "peyman.zibaeifar2032@gmail.com",
      respond: (t) => t === "studioPocketAccess"
        ? [200, { account: { isOwner: false, canViewAppStats: false, accountEmail: "user@example.invalid" }, appStats: null }]
        : [400, { error: "بارگذاری از سرور فقط برای صاحب استودیو با ایمیل ثبت‌شده فعال است." }],
    });
    await statsHidden(page);
    verdict.scenarios.regular = { calls, hidden: true };
    await context.close();
  }
  // C: other profession → no probe at all, nothing owner-only.
  {
    const { context, page, calls } = await scenario("barber", {
      professionId: "barber", typedEmail: "peyman.zibaeifar2032@gmail.com",
      respond: () => [200, { account, appStats: stats }],
    });
    await statsHidden(page);
    assert.equal(calls.filter((c) => c === "studioPocketAccess").length, 0);
    verdict.scenarios.otherProfession = { calls, hidden: true };
    await context.close();
  }
  // D: verified owner session.
  {
    const { context, page, calls } = await scenario("owner", {
      professionId: "tattoo_artist", typedEmail: "anything@example.invalid",
      respond: (t) => t === "studioPocketAccess" ? [200, { account, appStats: stats }] : t === "studioPocketExport" ? [200, ownerExport] : [200, { ok: true }],
    });
    await page.getByTestId("owner-badge").waitFor();
    await page.getByRole("tab", { name: "آمار اپلیکیشن" }).click();
    await page.getByText("qa@example.invalid").waitFor();
    await shot(page, "owner-stats");
    // manual cash row first: must survive server sync
    await page.getByRole("tab", { name: /صندوق/ }).click();
    await page.getByPlaceholder("عنوان").fill("ردیف دستی");
    await page.getByPlaceholder("مبلغ به تومان").fill("200000");
    await page.getByRole("button", { name: "ذخیره", exact: true }).click();
    await page.getByText("ردیف دستی").waitFor();
    for (let i = 0; i < 2; i++) {
      await page.getByRole("tab", { name: "تقویم" }).click();
      await page.getByRole("button", { name: "دانلود نوبت‌ها" }).click();
      await page.getByText(/بارگذاری کامل شد/).first().waitFor();
    }
    await page.getByTestId("booking-actions").waitFor();
    const money = await page.getByTestId("booking-money").first().innerText();
    assert.ok(money.includes("۱,۵۰۰,۰۰۰") && money.includes("۲,۵۰۰,۰۰۰"), money);
    const hrefs = await page.locator("[data-testid=booking-actions] a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.ok(hrefs.includes("tel:09120000001"));
    assert.ok(hrefs.includes("tel:09350000002"));
    assert.ok(hrefs.includes("sms:09120000001"));
    assert.ok(hrefs.includes("https://wa.me/989120000001"));
    assert.ok(hrefs.includes("https://kasbokarapp.com/studio/admin?tab=requests"));
    assert.ok(hrefs.includes("https://kasbokarapp.com/studio/admin?tab=messages"));
    assert.ok(hrefs.every((h) => /^(tel:|sms:|https:\/\/)/.test(h)));
    await page.getByTestId("booking-actions").getByText("10x6").waitFor();
    await page.getByRole("button", { name: "پیامک‌های آماده (مثل پنل سایت)" }).click();
    assert.equal(await page.locator("[data-sms]").count(), 14); // 1.15.1: all 14 site booking templates
    await shot(page, "owner-day-actions");
    await page.getByRole("tab", { name: /صندوق/ }).click();
    await page.getByTestId("cash-server-summary").waitFor();
    assert.ok((await page.getByTestId("cash-server-summary").innerText()).includes("۸۰۰,۰۰۰"));
    await page.getByTestId("cash-sync-all").click();
    await page.getByTestId("cash-server-status").getByText(/صندوق سایت دریافت شد/).waitFor();
    await page.getByText("ردیف دستی").waitFor();
    assert.equal(await page.getByText("کرایه آزمایشی").count(), 1, "no duplicate after two downloads");
    // The cash panel re-reads its rows after a site load; wait for that read instead of sampling mid-remount.
    await page.waitForFunction(() => document.querySelectorAll(".pocket-card li, ul > li.pocket-card, li.pocket-tx").length >= 3, null, { timeout: 10000 });
    assert.equal(await page.locator(".pocket-card li, ul > li.pocket-card, li.pocket-tx").count() >= 3, true);
    await shot(page, "owner-cash");
    await page.getByRole("tab", { name: /هنرجو|کارآموز/ }).click();
    // 1.14.3: trainees are already applied by the unified site load; the panel button re-runs that same load.
    await page.getByText(/هنرجوی سایت/).first().waitFor();
    await page.getByRole("button", { name: "بارگذاری همه از سایت (نوبت، هنرجو، صندوق)" }).click();
    await page.getByText("بارگذاری نوبت‌ها کامل شد").last().waitFor();
    assert.equal(await page.getByText(/هنرجوی سایت/).count() >= 1, true);
    await shot(page, "owner-trainees");
    // reload: role is NOT cached; stats stay hidden until the server answers again
    await page.unroute("**/api/**");
    await page.route("**/api/**", (route) => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
    await page.reload();
    await page.getByRole("tablist").waitFor();
    await page.waitForTimeout(800);
    await statsHidden(page);
    await page.getByRole("tab", { name: /صندوق/ }).click();
    await page.getByTestId("cash-server-summary").waitFor(); // locally stored ledger copy remains readable offline
    verdict.scenarios.owner = { calls, statsAfterLogout: "hidden", cashKeptOffline: true };
    await context.close();
  }
  verdict.ok = verdict.errors.length === 0;
} catch (error) {
  verdict.ok = false;
  verdict.failure = String(error?.stack || error);
} finally {
  await writeFile(`${out}/verdict.json`, JSON.stringify(verdict, null, 2));
  await browser.close();
  server.close();
}
console.log(JSON.stringify(verdict, null, 2));
if (!verdict.ok) process.exit(1);
