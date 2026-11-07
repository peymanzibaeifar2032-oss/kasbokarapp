import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOOKING_SMS, TRAINEE_SMS, bookingInstant, bookingSmsText, traineeSmsText } from "./sms-templates.ts";
import { paymentDetailsText, STUDIO_ADDRESS, STUDIO_CONTACT_PHONE } from "../tattoo-flow.ts";
import { toSmsLink } from "../format.ts";
import type { PocketBooking } from "../pocket-book.ts";

// Expected texts below were copied by hand from the website source (src/lib/tattoo-flow.ts,
// src/lib/studio-apprentices.ts) BEFORE the 1.15.1 edit. Synthetic fixture names/phones only.
const row = { id: "b1", day: "1405-08-20", time: "14:30", name: "سارا احمدی", phone: "09120000001", style: "گل رز", placement: "ساعد", priceToman: 3000000, serverId: null, pinned: true } as unknown as PocketBooking;
const site = { ...row, serverId: "r1", server: { slotStart: "2026-11-11T11:00:00.000Z", priceMinToman: 4000000, paidToman: 1500000, depositToman: 500000, phone2: "", idea: "" } } as unknown as PocketBooking;
const L = (...lines: string[]) => lines.join("\n");

describe("pocket SMS = website SMS (exact full text)", () => {
  it("covers every website booking + apprentice template", () => {
    assert.deepEqual(BOOKING_SMS.map((k) => k.kind).sort(), ["balance", "card", "care", "care-itch", "care-month", "care-wash", "confirm", "fillin-missed", "fillin-offer", "fillin-registered", "food", "prep", "proposal-seen", "reminder"]);
    assert.deepEqual(TRAINEE_SMS.map((k) => k.kind), ["trainee-joined", "trainee-thursday", "trainee-practice"]);
  });
  it("confirm (local booking day+time, Tehran)", () => {
    assert.equal(bookingSmsText(row, "confirm"), L("خانم سارا احمدی", "نوبت تاتو شما قطعی شد.", "روز اجرا: چهارشنبه", "تاریخ اجرا: ۲۰ آبان ۱۴۰۵، ساعت ۱۴:۳۰", `محل اجرا: ${STUDIO_ADDRESS}`, "مبلغ واریزی: ۰ تومان", `تلفن استودیو: ${STUDIO_CONTACT_PHONE}`));
    assert.equal(bookingInstant(row), "2026-11-11T11:00:00.000Z");
  });
  it("confirm/balance use real site paid/price", () => {
    assert.match(bookingSmsText(site, "confirm"), /\nمبلغ واریزی: ۱٬۵۰۰٬۰۰۰ تومان\n/);
    assert.equal(bookingSmsText(site, "balance"), L("سلام خانم سارا", "مبلغ کل: ۴٬۰۰۰٬۰۰۰ تومان", "مجموع واریزی: ۱٬۵۰۰٬۰۰۰ تومان", "مانده: ۲٬۵۰۰٬۰۰۰ تومان"));
  });
  it("reminder", () => {
    const t = bookingSmsText(row, "reminder").split("\n");
    assert.equal(t[0], "خانم سارا احمدی"); assert.equal(t[1], "یادآوری نوبت تاتو.");
    assert.match(t[2]!, /ساعت ۱۴:۳۰ وقت شماست\.$/);
    assert.equal(t[4], `آدرس: ${STUDIO_ADDRESS}`); assert.equal(t[5], "مانده پرداخت در استودیو: ۳٬۰۰۰٬۰۰۰ تومان"); assert.equal(t[6], `تلفن استودیو: ${STUDIO_CONTACT_PHONE}`);
  });
  it("card text = website payment details (not printed)", () => {
    assert.equal(bookingSmsText(row, "card"), L("سلام خانم سارا", paymentDetailsText()));
  });
  it("prep / food / care / aftercare stages", () => {
    assert.equal(bookingSmsText(row, "prep"), L("سلام خانم سارا", "آماده‌سازی قبل تاتو", "از حالا تا روز اجرا این‌ها را نخورید: قهوه، قرص آسپرین، نوشابه گازدار و مشروب. مشروب پوست را کم‌آب می‌کند و رنگ را بد می‌گیرد.", "اگر می‌توانید یک کرم آبرسان بگیرید و پوست محل تاتو را با آن نرم نگه دارید.", "شب قبل از تاتو، از ساعت ۱۰ شب بخوابید و ۸ ساعت خواب کامل داشته باشید تا خواب عمیق باشد.", "شب قبل، سرم قندی‌نمکی به همراه آمپول دگزامتازون بزنید تا التهاب کمتر شود.", "صبح روز اجرا تغذیه کافی همراه بیاورید تا وسط کار ضعف نکنید."));
    assert.equal(bookingSmsText(row, "food"), L("سلام خانم سارا", "برای حین کار هم آب، آبمیوه، میوه مثل موز یا سیب و یه خوراکی شیرین مثل شکلات یا خرما همراهتون داشته باشید تا اگه اجرای تاتو طول کشید، بدنتون افت نکنه و ضعف نکنید.", "امشب هم سعی کنید زودتر بخوابید و خواب کافی داشته باشید تا بدنتون برای فردا سرحال باشه. 🙏"));
    assert.equal(bookingSmsText(row, "care"), L("سلام خانم سارا", "۲ ساعت بعد سلفون را بردار و دوش بگیر.", "۳ روز اول، هر روز صبح و ظهر و شب دوش بگیر. چرب نکن.", "روز چهارم تاتو را باز بگذار.", "از روز پنجم تا یک ماه، روزی ۵ بار با پماد دکسپانتونل ملایم چرب کن."));
    assert.equal(bookingSmsText(row, "care-wash", { honorific: "آقا" }), L("سلام آقا سارا", "روزی ۳ بار حمام کن.", "هر بار تاتو را کامل بشوی.", "بعد از حمام پانسمان کن.", "تا روز چهارم چرب نکن."));
    assert.equal(bookingSmsText(row, "care-itch"), L("سلام خانم سارا", "تاتو را نخارانید.", "از روز چهارم با پماد دکسپانتونل چرب کن."));
    assert.equal(bookingSmsText(row, "care-month"), L("سلام خانم سارا", "تا یک ماه، روزی ۵ تا ۶ بار، سطح پوست را ملایم با پماد دکسپانتونل چرب کن."));
  });
  it("proposal-seen / fill-in", () => {
    assert.equal(bookingSmsText(row, "proposal-seen"), L("سلام خانم سارا", "درخواستت دیده شد.", "سایت را باز کن.", "پایین صفحه، وضعیت را بزن.", "شماره ۰۹۱۲۰۰۰۰۰۰۱ را بنویس و دیدن وضعیت را بزن."));
    assert.equal(bookingSmsText(row, "fillin-offer"), L("سلام سارا احمدی", "امروز جا خالی شد. اگر امروز می‌آیی زنگ بزن یا جواب بده.", "طرح: گل رز، ۳ میلیون", "پرداخت همان روز با کارت‌خوان.", "چهارراه بسیج، مجتمع ارشاد، ط۴ واحد ۱۶", STUDIO_CONTACT_PHONE));
    assert.equal(bookingSmsText(row, "fillin-missed"), L("سلام سارا احمدی", "امروز برایت وقت تاتو گذاشتم.", "لطفاً همین حالا زنگ بزن.", STUDIO_CONTACT_PHONE));
    assert.equal(bookingSmsText(row, "fillin-registered"), L("سلام سارا احمدی", "اسم شما در لیست انتظار کنسلی ثبت شد. در اولین فرصت تاتوآرتیست با شما تماس می‌گیرد.", `تلفن: ${STUDIO_CONTACT_PHONE}`));
  });
  it("trainee SMS", () => {
    const p = { name: "مریم", honorific: "خانم", startedOn: "1405-08-01" };
    assert.equal(traineeSmsText(p, "trainee-joined"), L("خانم مریم", "شما در تاریخ ۱ آبان ۱۴۰۵ به لیست هنرجوهای پیمان زیبائی‌فر پیوستید."));
    assert.equal(traineeSmsText(p, "trainee-thursday"), "لطفا هر چهارشنبه غروب راس ساعت ۸ اعلام آمادگی برای حضور در کلاس را در جواب این پیامک بفرستید. در صورتی که تمرینات آماده نیست یا ناقص است برای هفته بعد هماهنگ کنید.");
    assert.equal(traineeSmsText(p, "trainee-practice"), "سلام. تمریناتتون اگر آماده است از طریق روبیکا بفرستید. در غیر این صورت در جواب این پیامک بنویسید که فردا در کلاس شرکت نمی‌کنید و تمرینات آماده نیست.");
  });
  it("no undefined/null and sms: URI round-trips the full multiline text", () => {
    for (const { kind } of BOOKING_SMS) for (const r of [row, site, { ...row, time: "", priceToman: 0, phone: "" } as PocketBooking]) {
      const text = bookingSmsText(r, kind);
      assert.equal(/undefined|null|NaN/.test(text), false, kind);
      const href = toSmsLink("09120000001", text)!;
      assert.match(href, /^sms:09120000001\?body=/);
      assert.equal(decodeURIComponent(href.split("?body=")[1]!), text);
    }
  });
});
