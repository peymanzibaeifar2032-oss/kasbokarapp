import { applyTestLicense, pocketRoot } from "./pocket-license-fixture.mjs";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root = resolve(pocketRoot());
const out = resolve("artifacts/qa-1.13.0");
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
const choose = async (button, path) => {
  const event = page.waitForEvent("filechooser");
  await button.click();
  const chooser = await event;
  await chooser.setFiles(path);
};
try {
  await page.goto(base + "/index.html");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  await page.getByRole("textbox", { name: "جستجوی شغل" }).fill("مکانیکی");
  await page.getByRole("button", { name: "مکانیکی خودرو", exact: true }).click();
  await screenshot("job-search-mobile");
  await page.getByRole("button", { name: "شروع", exact: true }).click();
  await page.getByPlaceholder("name@email.com").fill("qa@example.invalid");
  await page.getByRole("button", { name: "ادامه", exact: true }).click();
  await page.getByRole("button", { name: "ثبت نوبت همین روز", exact: true }).click();
  await page.getByRole("textbox", { name: "نام مشتری", exact: true }).fill("مشتری آزمایشی");
  await page.getByRole("textbox", { name: "خودرو / پلاک", exact: true }).fill("سرویس موتور");
  await page.getByRole("textbox", { name: "شماره پلاک", exact: true }).fill("۱۲ الف ۳۴۵");
  await page.locator("input[type=time]").fill("14:30");
  await page.getByRole("textbox", { name: "برآورد به تومان", exact: true }).fill("۲۵۰۰۰۰۰");
  await page.getByRole("button", { name: "＋ افزودن عنوان کادر و پاسخ", exact: true }).click();
  await page.getByRole("textbox", { name: "عنوان کادر 1", exact: true }).fill("قطعه سفارشی");
  await page.getByRole("textbox", { name: "پاسخ کادر 1", exact: true }).fill("لنت ترمز");
  await page.getByRole("checkbox", { name: /عنوان کادرها برای نوبت‌های جدید/ }).check();
  await choose(
    page.getByRole("button", { name: "انتخاب عکس از گالری", exact: true }),
    resolve("android-tattoo-booking/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"),
  );
  await page.getByAltText("پیش‌نمایش عکس انتخاب‌شده").waitFor();
  await screenshot("gallery-custom-fields-mobile");
  await page.getByRole("button", { name: "ذخیره", exact: true }).click();
  await page.getByText("مشتری آزمایشی", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("لنت ترمز", { exact: false }).waitFor();
  assert.equal(await page.locator("li img").count(), 1);
  await page.getByRole("tab", { name: "کارآموزها", exact: true }).click();
  await page.getByPlaceholder("نام", { exact: true }).fill("هنرجوی آزمایشی");
  await page.getByPlaceholder("شهریه کل به تومان").fill("500000");
  await page.getByRole("button", { name: "افزودن", exact: true }).click();
  await page.getByText("آقا/خانم هنرجوی آزمایشی", { exact: true }).waitFor();
  page.once("dialog", (dialog) => dialog.accept("۲۰۰۰۰۰"));
  await page.getByRole("button", { name: "واریزی", exact: true }).click();
  await page.getByText("۲۰۰,۰۰۰ تومان", { exact: true }).first().waitFor();
  // 1.14.3: JSON/PDF live only in the Backup tab.
  for (const t of ["کارآموزها", "تقویم"]) {
    await page.getByRole("tab", { name: t, exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "خروجی JSON", exact: true }).count(), 0);
  }
  await page.getByRole("tab", { name: "پشتیبان", exact: true }).click();
  await download("خروجی JSON", "roundtrip.json");
  const backup = JSON.parse(await readFile(`${out}/roundtrip.json`, "utf8"));
  assert.equal(backup.bookings.length, 1);
  assert.equal(backup.trainees.length, 1);
  assert.equal(backup.traineePayments.length, 1);
  assert.equal(backup.schemaVersion, 3);
  assert.ok(Array.isArray(backup.cashEntries));
  assert.equal(backup.bookings[0].priceToman, 2500000);
  assert.equal(backup.trainees[0].paidToman, 200000);
  assert.equal(backup.bookings[0].customFields[0].value, "لنت ترمز");
  assert.ok(backup.bookings[0].photo.startsWith("data:image/jpeg"));
  backup.bookings[0].customFields[0].value = "فیلتر روغن واردشده";
  backup.trainees[0].sessionsDone = 7;
  await writeFile(`${out}/import.json`, JSON.stringify(backup));
  await choose(
    page.getByRole("button", { name: "وارد کردن JSON", exact: true }),
    `${out}/import.json`,
  );
  await page.getByRole("dialog", { name: "تأیید وارد کردن فایل" }).waitFor();
  await page.getByRole("checkbox", { name: /جایگزینی موارد هم‌شناسه/ }).check();
  // 1.16.0: replacing same-id items asks for an explicit confirmation first.
  let replaceConfirm = "";
  page.once("dialog", (dialog) => { replaceConfirm = dialog.message(); void dialog.accept(); });
  await page.getByRole("button", { name: "تأیید و وارد کردن", exact: true }).click();
  await page.getByRole("tab", { name: "کارآموزها", exact: true }).click();
  await page.getByText(/جلسه ۷\/۱۲/).waitFor();
  assert.match(replaceConfirm, /جایگزین/);
  await screenshot("trainee-after-import-mobile");
  await page.getByRole("tab", { name: "تقویم", exact: true }).click();
  await page.getByText("فیلتر روغن واردشده", { exact: false }).waitFor();
  await page.getByRole("tab", { name: "پشتیبان", exact: true }).click();
  await download("دانلود PDF نوبت‌ها", "appointments.pdf");
  const pdf = await readFile(`${out}/appointments.pdf`);
  assert.equal(pdf.subarray(0, 8).toString(), "%PDF-1.4");
  assert.ok(pdf.length > 20000);
  // Validation failure must not change the local booking.
  await writeFile(
    `${out}/invalid.json`,
    JSON.stringify({ bookings: [{ ...backup.bookings[0], day: "1405-07-31" }] }),
  );
  await choose(
    page.getByRole("button", { name: "وارد کردن JSON", exact: true }),
    `${out}/invalid.json`,
  );
  await page
    .getByText("ساختار فایل معتبر نیست؛ هیچ داده‌ای تغییر نکرد.", { exact: true })
    .waitFor();
  assert.equal(await page.getByRole("dialog", { name: "تأیید وارد کردن فایل" }).count(), 0);
  await page.getByRole("tab", { name: "تقویم", exact: true }).click();
  const mobile = await screenshot("calendar-mobile");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1280, height: 900 });
  const desktop = await screenshot("calendar-desktop");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // Edit and remove photo is persistent too.
  await page.getByRole("button", { name: "ویرایش", exact: true }).click();
  await page.getByRole("button", { name: "حذف عکس", exact: true }).click();
  await page.getByRole("button", { name: "ذخیره", exact: true }).click();
  await page.locator("li img").waitFor({ state: "detached" });
  await page.reload();
  await page.getByText("مشتری آزمایشی", { exact: true }).waitFor();
  assert.equal(await page.locator("li img").count(), 0);
  await page.getByRole("button", { name: "ثبت نوبت همین روز", exact: true }).click();
  assert.equal(
    await page.getByRole("textbox", { name: "عنوان کادر 1", exact: true }).inputValue(),
    "قطعه سفارشی",
  );
  assert.equal(
    await page.getByRole("textbox", { name: "پاسخ کادر 1", exact: true }).inputValue(),
    "",
  );
  await page.getByRole("button", { name: "بستن", exact: true }).click();
  await page.getByRole("button", { name: "ویرایش", exact: true }).click();
  await page.getByRole("textbox", { name: "عنوان کادر 1", exact: true }).fill("قطعه ویرایش‌شده");
  await page.getByRole("button", { name: "ذخیره", exact: true }).click();
  await page.getByText("قطعه ویرایش‌شده:", { exact: true }).waitFor();
  await page.getByRole("button", { name: "ویرایش", exact: true }).click();
  await page.getByRole("button", { name: "حذف این کادر", exact: true }).click();
  await page.getByRole("button", { name: "ذخیره", exact: true }).click();
  await page.getByRole("button", { name: "ذخیره", exact: true }).waitFor({ state: "detached" });
  await page.reload();
  await page.getByText("مشتری آزمایشی", { exact: true }).waitFor();
  assert.equal(await page.getByText("قطعه ویرایش‌شده:", { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  const verdict = {
    ok: true,
    browser: "Chromium headless (not Android)",
    checks: [
      "109-job search",
      "contextual vehicle fields",
      "custom title/value CRUD",
      "real file chooser",
      "compressed photo persists across reload",
      "photo removal persists",
      "JSON export/import including trainees",
      "reviewed overwrite",
      "invalid import rejection",
      "real Persian PDF download",
      "mobile and desktop no overflow",
    ],
    consoleErrors: errors,
    mobileScreenshot: mobile,
    desktopScreenshot: desktop,
    pdf: `${out}/appointments.pdf`,
  };
  await writeFile(`${out}/verdict.json`, JSON.stringify(verdict, null, 2));
  console.log(JSON.stringify(verdict, null, 2));
} finally {
  await browser.close();
  server.close();
}
