import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage, downloadImage } from "@/lib/design-images";
import { formatFaDate, isIranMobile, normalizeIranPhone } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import { digitsOnly, formatGroupedDigits, formatTattooToman } from "@/lib/tattoo-flow";

type ConsentRecord = {
  code: string;
  customerName: string;
  nationalId: string;
  phone: string;
  placement: string;
  sizeCm: string;
  priceToman: number;
  paidToman: number;
  designImage: string;
  createdAt: string;
};

type ConsentListItem = {
  code: string;
  customerName: string;
  phone: string;
  createdAt: string;
};

const LINES = [
  "اینجانب با آگاهی و اختیار کامل، اجرای تاتو با طرح، محل و اندازهٔ بالا را از پیمان زیبائی‌فر می‌خواهم.",
  "۱. هجده سال تمام دارم و این رضایت را خودم امضا می‌کنم.",
  "۲. طرح پیوست، محل اجرا و اندازه را دیده‌ام و همان را قبول دارم. تغییر بعدی فقط با توافق تازه است.",
  "۳. می‌دانم تاتو دائمی است و پاک کردن آن آسان، کامل یا بدون هزینه نیست.",
  "۴. از درد، خونریزی، تورم، خارش، عفونت، حساسیت، گوشت اضافه، کم‌رنگ شدن، پخش رنگ و فرق نتیجه روی پوست‌های مختلف آگاهم. نتیجه برای همه یکسان نیست و این برگه ضمانت پزشکی نیست.",
  "۵. بارداری، شیردهی، بیماری پوستی فعال، دیابت کنترل‌نشده، مشکل انعقاد، مصرف الکل یا داروی رقیق‌کننده را پنهان نکرده‌ام. اگر چیزی را نگفته باشم، عارضهٔ ناشی از آن بر عهدهٔ خودم است.",
  "۶. مراقبت بعد از تاتو را که آرتیست گفته انجام می‌دهم. کوتاهی در شستشو، چرب کردن، آفتاب، استخر، سونا و مشروب بر عهدهٔ خودم است.",
  "۷. مبلغ و بیعانهٔ توافق‌شده را قبول دارم. با شروع اجرا، بیعانه بابت وقت رزروشده برنمی‌گردد.",
  "۸. اجازه می‌دهم عکس کار، بدون چهره، برای نمونه کار استودیو استفاده شود.",
];

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

async function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

export async function drawConsentSheet(form: ConsentRecord) {
  await document.fonts.load("16px Vazirmatn Variable");
  const width = 1654;
  const height = 2339;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("برگه ساخته نشد.");
  const margin = 72;
  const right = width - margin;
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#b7955b";
  ctx.fillRect(0, 0, width, 16);
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#1c1c1c";
  ctx.font = "700 54px Vazirmatn Variable";
  ctx.fillText("رضایت‌نامه اجرای تاتو", right, 96);
  ctx.font = "28px Vazirmatn Variable";
  ctx.fillStyle = "#6b5424";
  ctx.fillText("استودیو پیمان زیبائی‌فر  ·  کرمانشاه", right, 146);
  ctx.fillStyle = "#1c1c1c";
  ctx.font = "700 26px Vazirmatn Variable";
  ctx.fillText(`کد پیگیری  ${form.code}`, right, 196);
  ctx.font = "26px Vazirmatn Variable";
  ctx.fillText(formatFaDate(form.createdAt), margin + 280, 196);

  const photoX = margin;
  const photoY = 240;
  const photoW = 680;
  const photoH = 760;
  ctx.fillStyle = "#f6f1e7";
  ctx.fillRect(photoX, photoY, photoW, photoH);
  ctx.strokeStyle = "#d9c7a2";
  ctx.lineWidth = 2;
  ctx.strokeRect(photoX, photoY, photoW, photoH);
  const photo = await loadImage(form.designImage);
  const scale = Math.min(photoW / photo.width, photoH / photo.height);
  const pw = photo.width * scale;
  const ph = photo.height * scale;
  ctx.drawImage(photo, photoX + (photoW - pw) / 2, photoY + (photoH - ph) / 2, pw, ph);
  ctx.font = "22px Vazirmatn Variable";
  ctx.fillStyle = "#6b5424";
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.fillText("طرح مورد تأیید", photoX + photoW / 2, photoY + photoH + 36);
  ctx.textAlign = "right";

  const facts: Array<[string, string]> = [
    ["نام", form.customerName],
    ["کد ملی", form.nationalId],
    ["تلفن", form.phone],
    ["محل اجرا", form.placement],
    ["ابعاد", form.sizeCm],
    ["مبلغ اجرا", formatTattooToman(form.priceToman)],
    ["واریزی", formatTattooToman(form.paidToman)],
  ];
  const factLeft = photoX + photoW + 48;
  facts.forEach(([label, value], index) => {
    const y = photoY + 28 + index * 104;
    ctx.font = "22px Vazirmatn Variable";
    ctx.fillStyle = "#8a7040";
    ctx.fillText(label, right, y);
    ctx.font = "700 32px Vazirmatn Variable";
    ctx.fillStyle = "#1c1c1c";
    ctx.fillText(value, right, y + 44);
    ctx.strokeStyle = "#eadfcb";
    ctx.beginPath();
    ctx.moveTo(factLeft, y + 64);
    ctx.lineTo(right, y + 64);
    ctx.stroke();
  });

  let y = photoY + photoH + 78;
  ctx.strokeStyle = "#b7955b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  y += 48;
  ctx.fillStyle = "#1c1c1c";
  ctx.font = "28px Vazirmatn Variable";
  const signatureTop = height - margin - 250;
  for (const paragraph of LINES) {
    const lines = wrap(ctx, paragraph, width - margin * 2);
    for (const line of lines) {
      if (y > signatureTop - 24) break;
      ctx.fillText(line, right, y);
      y += 42;
    }
    y += 12;
  }

  const boxW = 620;
  const boxH = 190;
  const boxY = height - margin - boxH;
  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, boxY, boxW, boxH);
  ctx.strokeRect(right - boxW, boxY, boxW, boxH);
  ctx.font = "24px Vazirmatn Variable";
  ctx.fillStyle = "#1c1c1c";
  ctx.fillText("اثر انگشت", right - 16, boxY - 16);
  ctx.textAlign = "left";
  ctx.fillText("امضا", margin + 8, boxY - 16);
  ctx.textAlign = "right";
  ctx.font = "20px Vazirmatn Variable";
  ctx.fillStyle = "#777";
  ctx.fillText("این برگه با امضا و اثر انگشت مشتری معتبر است.", right, height - 36);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Same box `drawConsentSheet` labels امضا: bottom-left of the A4 sheet. */
export const CONSENT_SIGNATURE_BOX = { sheetW: 1654, sheetH: 2339, x: 72, y: 2077, w: 620, h: 190 };

export async function stampSignatureOnConsent(sheetUrl: string, signatureUrl: string) {
  if (!sheetUrl.startsWith("data:image/")) throw new Error("اول خود برگهٔ رضایت‌نامه را بگذار. امضا جای برگه را نمی‌گیرد.");
  const sheet = await loadImage(sheetUrl);
  const sign = await loadImage(signatureUrl);
  const canvas = document.createElement("canvas");
  canvas.width = sheet.width;
  canvas.height = sheet.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("برگه ساخته نشد.");
  ctx.drawImage(sheet, 0, 0);
  const box = CONSENT_SIGNATURE_BOX;
  const sx = sheet.width / box.sheetW;
  const sy = sheet.height / box.sheetH;
  const pad = 22;
  const x = (box.x + pad) * sx;
  const y = (box.y + pad) * sy;
  const w = Math.max(8, (box.w - pad * 2) * sx);
  const h = Math.max(8, (box.h - pad * 2) * sy);
  const scale = Math.min(w / sign.width, h / sign.height);
  const dw = sign.width * scale;
  const dh = sign.height * scale;
  ctx.drawImage(sign, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  let out = canvas;
  let quality = 0.86;
  let url = out.toDataURL("image/jpeg", quality);
  while (url.length > 900_000 && quality > 0.55) {
    quality -= 0.08;
    url = out.toDataURL("image/jpeg", quality);
  }
  while (url.length > 900_000 && out.width > 900) {
    const next = document.createElement("canvas");
    next.width = Math.round(out.width * 0.82);
    next.height = Math.round(out.height * 0.82);
    const nextCtx = next.getContext("2d");
    if (!nextCtx) break;
    nextCtx.drawImage(out, 0, 0, next.width, next.height);
    out = next;
    url = out.toDataURL("image/jpeg", 0.8);
  }
  if (url.length > 1_000_000) throw new Error("برگه با امضا سنگین شد. عکس برگه را کم‌حجم‌تر بگذار.");
  return url;
}

export function ConsentBoard() {
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [placement, setPlacement] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [price, setPrice] = useState("");
  const [paid, setPaid] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState("");
  const [rows, setRows] = useState<ConsentListItem[]>([]);

  async function refresh() {
    const list = await saveAction<ConsentListItem[]>("listStudioConsents");
    setRows(list);
  }

  useEffect(() => {
    void refresh().catch(() => setRows([]));
  }, []);

  async function printStored(record: ConsentRecord) {
    const sheet = await drawConsentSheet(record);
    downloadImage(sheet, `rezayat-${record.code}.jpg`);
  }

  async function save() {
    if (name.trim().length < 2) return toast.error("نام را بنویس.");
    if (digitsOnly(nationalId).length !== 10) return toast.error("کد ملی باید ۱۰ رقم باشد.");
    const normalized = normalizeIranPhone(phone);
    if (!isIranMobile(normalized)) return toast.error("شماره موبایل درست نیست.");
    if (placement.trim().length < 2) return toast.error("محل اجرا را بنویس.");
    if (!sizeCm.trim()) return toast.error("ابعاد را بنویس.");
    if (!price) return toast.error("مبلغ اجرا را بنویس.");
    if (!image) return toast.error("تصویر طرح را بگذار.");
    setBusy(true);
    try {
      const saved = await saveAction<{ code: string }>("saveStudioConsent", {
        customerName: name.trim(),
        nationalId: digitsOnly(nationalId),
        phone: normalized,
        placement: placement.trim(),
        sizeCm: sizeCm.trim(),
        priceToman: Number(price || 0),
        paidToman: Number(paid || 0),
        designImage: image,
      });
      const record: ConsentRecord = {
        code: saved.code,
        customerName: name.trim(),
        nationalId: digitsOnly(nationalId),
        phone: normalized,
        placement: placement.trim(),
        sizeCm: sizeCm.trim(),
        priceToman: Number(price || 0),
        paidToman: Number(paid || 0),
        designImage: image,
        createdAt: new Date().toISOString(),
      };
      await printStored(record);
      toast.success(`رضایت‌نامه ذخیره شد. کد ${saved.code}`);
      setName("");
      setNationalId("");
      setPhone("");
      setPlacement("");
      setSizeCm("");
      setPrice("");
      setPaid("");
      setImage("");
      await refresh();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function reprint() {
    const code = digitsOnly(lookup);
    if (code.length < 4) return toast.error("کد پیگیری را بنویس.");
    setBusy(true);
    try {
      const record = await saveAction<ConsentRecord>("studioConsent", { code });
      await printStored(record);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-4">
      <article className="rounded-3xl border border-border bg-surface p-4">
        <h2 className="text-lg font-bold">رضایت‌نامه مشتری</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          مشخصات و طرح را وارد کن. یک عکس آمادهٔ چاپ می‌گیری که امضا و اثر انگشت دارد و با کد پیگیری دوباره قابل چاپ است.
        </p>
        <div className="mt-4 grid gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام مشتری" />
          <Input value={nationalId} onChange={(e) => setNationalId(digitsOnly(e.target.value).slice(0, 10))} inputMode="numeric" dir="ltr" placeholder="کد ملی" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="شماره تماس" />
          <Input value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="محل اجرا" />
          <Input value={sizeCm} onChange={(e) => setSizeCm(e.target.value)} placeholder="ابعاد، مثلاً ۱۲ در ۲۰ سانتی‌متر" />
          <Input value={formatGroupedDigits(price)} onChange={(e) => setPrice(digitsOnly(e.target.value))} inputMode="numeric" dir="ltr" placeholder="مبلغ اجرا، تومان" />
          <Input value={formatGroupedDigits(paid)} onChange={(e) => setPaid(digitsOnly(e.target.value))} inputMode="numeric" dir="ltr" placeholder="واریزی مشتری، تومان" />
          <label className="grid cursor-pointer gap-2 rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-4 text-center">
            <span className="text-base font-bold">تصویر طرح</span>
            <span className="text-sm leading-6 text-muted">اینجا بزن و عکس طرح را از گالری انتخاب کن.</span>
            <span className="mx-auto inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-fg">
              {image ? "عوض کردن تصویر طرح" : "انتخاب تصویر طرح"}
            </span>
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void compressImage(file).then(setImage).catch((err) => toast.error(friendlyError(err)));
              }}
            />
            {image ? <img src={image} alt="پیش‌نمایش طرح" className="mx-auto mt-1 h-44 max-w-full rounded-xl object-contain" /> : null}
          </label>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? "در حال ساخت…" : "ساخت برگه و دانلود"}
          </Button>
        </div>
      </article>
      <article className="rounded-3xl border border-border bg-surface p-4">
        <h2 className="font-bold">چاپ دوباره</h2>
        <div className="mt-3 flex gap-2">
          <Input value={lookup} onChange={(e) => setLookup(e.target.value)} dir="ltr" placeholder="کد پیگیری" />
          <Button variant="outline" disabled={busy} onClick={() => void reprint()}>
            دانلود
          </Button>
        </div>
        <div className="mt-4 grid gap-2">
          {rows.map((row) => (
            <button
              key={row.code}
              type="button"
              className="flex items-center justify-between rounded-2xl border border-border px-3 py-3 text-right text-sm"
              onClick={() => {
                setLookup(row.code);
                void saveAction<ConsentRecord>("studioConsent", { code: row.code })
                  .then((record) => printStored(record))
                  .catch((err) => toast.error(friendlyError(err)));
              }}
            >
              <span>
                {row.customerName}
                <span className="mt-1 block text-xs text-muted">{formatFaDate(row.createdAt)}</span>
              </span>
              <span dir="ltr">{row.code}</span>
            </button>
          ))}
          {!rows.length ? <p className="text-sm text-muted">هنوز رضایت‌نامه‌ای ذخیره نشده.</p> : null}
        </div>
      </article>
    </section>
  );
}
