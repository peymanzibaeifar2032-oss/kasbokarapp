import type { PocketBooking } from "../pocket-book.ts";
import { getProfessionPack, type ProfessionPack } from "./professions.ts";
import { toFaDigits } from "../calendar/jalali.ts";

export function bookingReportLines(rows: PocketBooking[], current: ProfessionPack): string[] {
  const lines = [
    "فهرست نوبت‌ها — کسب‌وکار",
    `تعداد نوبت: ${toFaDigits(rows.length)}`,
    "تاریخ‌ها شمسی • ساعت‌ها به وقت تهران • مبلغ‌ها تومان",
    "",
  ];
  for (const row of [...rows].sort(
    (a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time),
  )) {
    const pack = row.professionId ? getProfessionPack(row.professionId) : current;
    const fields = row.fieldSchema || pack.fields;
    lines.push(
      `${row.name} — ${toFaDigits(row.day.replace(/-/g, "/"))}  ${toFaDigits(row.time || "بدون ساعت")}`,
    );
    for (const field of fields) {
      if (["name", "time", "photo"].includes(field.storeAs)) continue;
      const value = field.storeAs === "details" ? row.details?.[field.id] : row[field.storeAs];
      if (value !== undefined && value !== "")
        lines.push(
          `${field.labelFa}: ${typeof value === "number" ? toFaDigits(value.toLocaleString("en-US")) : value}`,
        );
    }
    for (const field of row.customFields || []) lines.push(`${field.label}: ${field.value}`);
    if (row.photo) lines.push("عکس پیوست: در نسخه JSON نگهداری می‌شود");
    lines.push("────────────────────────", "");
  }
  return lines;
}
/** Small dependency-free PDF encoder. JPEG page images preserve browser Persian shaping / bidi. */
export function pdfFromJpegPages(
  pages: { bytes: Uint8Array; width: number; height: number }[],
): Uint8Array {
  if (!pages.length) throw new Error("No PDF pages");
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets = [0];
  let length = 0;
  const append = (value: string | Uint8Array) => {
    const bytes = typeof value === "string" ? enc.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, body: string | Uint8Array[]) => {
    offsets[n] = length;
    append(`${n} 0 obj\n`);
    if (typeof body === "string") append(body);
    else for (const part of body) append(part);
    append("\nendobj\n");
  };
  append("%PDF-1.4\n%Kasbokar\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`,
  );
  pages.forEach((page, i) => {
    const n = 3 + i * 3;
    object(
      n,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Img ${n + 1} 0 R >> >> /Contents ${n + 2} 0 R >>`,
    );
    object(n + 1, [
      enc.encode(
        `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`,
      ),
      page.bytes,
      enc.encode("\nendstream"),
    ]);
    const stream = "q 595.28 0 0 841.89 0 0 cm /Img Do Q\n";
    object(n + 2, `<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream`);
  });
  const xref = length;
  const count = 3 + pages.length * 3;
  append(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) append(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const result = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    result.set(chunk, cursor);
    cursor += chunk.length;
  }
  return result;
}
export function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let n = 0; n < bytes.length; n += 8192)
    binary += String.fromCharCode(...bytes.subarray(n, n + 8192));
  return btoa(binary);
}
export async function createBookingPdf(
  rows: PocketBooking[],
  pack: ProfessionPack,
): Promise<Uint8Array> {
  await document.fonts.load('26px "Vazirmatn Variable"');
  await document.fonts.ready;
  const width = 1240,
    height = 1754,
    margin = 85,
    lineHeight = 40;
  const pages: { bytes: Uint8Array; width: number; height: number }[] = [];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF canvas unavailable");
  let y = 0,
    page = 0;
  const start = () => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.font = '26px "Vazirmatn Variable", Vazirmatn, Tahoma, sans-serif';
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#152038";
    y = margin;
    page++;
  };
  const finish = () => {
    ctx.font = '20px "Vazirmatn Variable", Vazirmatn, sans-serif';
    ctx.fillStyle = "#64748b";
    ctx.fillText(`کسب‌وکار • صفحه ${toFaDigits(page)}`, width - margin, height - 60);
    pages.push({
      bytes: fromBase64(canvas.toDataURL("image/jpeg", 0.9).split(",")[1]),
      width,
      height,
    });
  };
  const draw = (line: string) => {
    if (y + lineHeight > height - margin) {
      finish();
      start();
    }
    ctx.fillText(line, width - margin, y);
    y += lineHeight;
  };
  start();
  for (const paragraph of bookingReportLines(rows, pack)) {
    for (const line of paragraph.split(/\r?\n/)) {
      let current = "";
      // Word wrap incl. oversized unbroken values; never clip notes at page boundaries.
      for (const char of line) {
        if (ctx.measureText(current + char).width > width - margin * 2) {
          draw(current);
          current = "";
        }
        current += char;
      }
      draw(current);
    }
  }
  finish();
  return pdfFromJpegPages(pages);
}

type FileBridge = {
  savePocketFile?: (requestId: string, name: string, mime: string, base64: string) => void;
};
/** SAF on Android 8+, ordinary browser download on web. Resolves only on native write completion. */
export async function savePocketFile(
  name: string,
  mime: "application/pdf" | "application/json",
  bytes: Uint8Array,
): Promise<void> {
  const native = (window as Window & { AndroidApp?: FileBridge }).AndroidApp;
  if (native?.savePocketFile) {
    await new Promise<void>((resolve, reject) => {
      const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("pocket-file-result", receive);
      };
      const receive = (event: Event) => {
        const result = (event as CustomEvent).detail;
        if (result?.requestId !== id) return;
        cleanup();
        result.ok
          ? resolve()
          : reject(new Error(result.cancelled ? "ذخیره فایل لغو شد." : "ذخیره فایل انجام نشد."));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("انتخاب محل ذخیره به پایان نرسید."));
      }, 300000);
      window.addEventListener("pocket-file-result", receive);
      try {
        native.savePocketFile!(id, name, mime, toBase64(bytes));
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
    return;
  }
  if (window.location.hostname === "appassets.androidplatform.net")
    throw new Error("برای ذخیره فایل نسخه جدید اپ را نصب کنید.");
  const url = URL.createObjectURL(new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
