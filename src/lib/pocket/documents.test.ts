import { pocketAmountDigits } from "./numbers.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { pdfFromJpegPages, bookingReportLines, fromBase64, toBase64 } from "./documents.ts";
import { getProfessionPack } from "./professions.ts";
test("PDF encoder emits valid offsets, independent pages, embedded JPEG and PDF MIME payload", () => {
  const jpeg = new Uint8Array([255, 216, 255, 217]);
  const bytes = pdfFromJpegPages([
    { bytes: jpeg, width: 10, height: 10 },
    { bytes: jpeg, width: 10, height: 10 },
  ]);
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.endsWith("%%EOF\n"));
  assert.ok(text.includes("/Count 2"));
  const start = Number(text.match(/startxref\n(\d+)/)?.[1]);
  assert.equal(new TextDecoder().decode(bytes.slice(start, start + 4)), "xref");
  const entries = text.slice(text.indexOf("0000000000 65535 f")).split("\n").slice(1, 9);
  entries.forEach((entry, i) => {
    const offset = Number(entry.slice(0, 10));
    assert.equal(new TextDecoder().decode(bytes.slice(offset, offset + 7)), `${i + 1} 0 obj`);
  });
  assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
});
test("Persian report includes Jalali date, time, contextual labels, notes, amount and custom fields", () => {
  const lines = bookingReportLines(
    [
      {
        id: "x",
        day: "1405-08-16",
        time: "09:45",
        name: "پیمان",
        phone: "09120000000",
        style: "رئال",
        placement: "بازو",
        note: "یادداشت کامل",
        priceToman: 2000000,
        serverId: null,
        pinned: true,
        customFields: [{ id: "x", label: "رنگ", value: "مشکی", kind: "text" }],
      },
    ],
    getProfessionPack("tattoo_artist"),
  ).join("\n");
  for (const value of [
    "۱۴۰۵/۰۸/۱۶",
    "۰۹:۴۵",
    "محل روی بدن: بازو",
    "قیمت به تومان: ۲,۰۰۰,۰۰۰",
    "رنگ: مشکی",
    "یادداشت کامل",
  ])
    assert.ok(lines.includes(value), value);
});
test("Android SAF bridge is narrow, native origin guarded and file chooser remains available", () => {
  const native = readFileSync(
    "android-tattoo-booking/app/src/main/java/com/peymanzibaeifar/tattoobooking/MainActivity.java",
    "utf8",
  );
  assert.ok(native.includes("Intent.ACTION_CREATE_DOCUMENT"));
  assert.ok(native.includes("isPocketDocument()"));
  assert.ok(native.includes('"application/json".equals(mime)'));
  assert.ok(native.includes("getContentResolver().openOutputStream(destination"));
  assert.ok(native.includes("fileSaveResult(id, saved"));
  const manifest = readFileSync("android-tattoo-booking/app/src/main/AndroidManifest.xml", "utf8");
  assert.ok(manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"'));
  for (const [density, size] of [
    ["mdpi", 48],
    ["hdpi", 72],
    ["xhdpi", 96],
    ["xxhdpi", 144],
    ["xxxhdpi", 192],
  ] as const)
    for (const name of ["ic_launcher", "ic_launcher_round", "ic_launcher_foreground"]) {
      const png = readFileSync(
        `android-tattoo-booking/app/src/main/res/mipmap-${density}/${name}.png`,
      );
      assert.equal(
        png.readUInt32BE(16),
        name.endsWith("foreground") ? Math.round(size * 2.25) : size,
      );
      assert.equal(png.readUInt32BE(20), png.readUInt32BE(16));
    }
});

test("Android Persian and Arabic numeric keyboards keep real amounts", () => {
  assert.equal(pocketAmountDigits("۲٬۵۰۰٬۰۰۰"), "2500000");
  assert.equal(pocketAmountDigits("١٢٣٤"), "1234");
});
