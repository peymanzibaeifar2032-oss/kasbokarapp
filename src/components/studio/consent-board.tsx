import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage, downloadImage } from "@/lib/design-images";
import { formatFaDate, isIranMobile, normalizeIranPhone } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import { digitsOnly } from "@/lib/tattoo-flow";

type ConsentRecord = {
  code: string;
  customerName: string;
  nationalId: string;
  phone: string;
  placement: string;
  sizeCm: string;
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
  "۸. اجازه می‌دهم عکس کار، بدون چهره، برای نمونه کار استودیو استفاده شود. اگر این بند را نمی‌خواهم، همین خط را خط می‌زنم.",
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
  const width = 1240;
  const height = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("برگه ساخته نشد.");
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, width, height);
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "700 42px Vazirmatn Variable";
  ctx.fillText("رضایت‌نامه اجرای تاتو", width - 64, 90);
  ctx.font = "28px Vazirmatn Variable";
  ctx.fillStyle = "#6b5424";
  ctx.fillText("استودیو پیمان زیبائی‌فر · کرمانشاه", width - 64, 136);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "700 26px Vazirmatn Variable";
  ctx.fillText(`کد پیگیری: ${form.code}`, width - 64, 184);
  const date = formatFaDate(form.createdAt);
  const facts = [
    `نام: ${form.customerName}`,
    `کد ملی: ${form.nationalId}`,
    `تلفن: ${form.phone}`,
    `محل اجرا: ${form.placement}`,
    `ابعاد: ${form.sizeCm}`,
    `تاریخ تنظیم: ${date}`,
  ];
  ctx.font = "26px Vazirmatn Variable";
  facts.forEach((line, index) => ctx.fillText(line, width - 64, 250 + index * 40));
  const photo = await loadImage(form.designImage);
  const maxW = 460;
  const maxH = 320;
  const scale = Math.min(maxW / photo.width, maxH / photo.height, 1);
  const pw = photo.width * scale;
  const ph = photo.height * scale;
  const px = 64;
  const py = 230;
  ctx.strokeStyle = "#d8ccb4";
  ctx.strokeRect(px - 8, py - 8, pw + 16, ph + 16);
  ctx.drawImage(photo, px, py, pw, ph);
  ctx.font = "22px Vazirmatn Variable";
  ctx.fillText("تصویر طرح مورد تأیید", px + pw - 8, py + ph + 36);
  let y = 540;
  ctx.font = "24px Vazirmatn Variable";
  for (const paragraph of LINES) {
    for (const line of wrap(ctx, paragraph, width - 128)) {
      ctx.fillText(line, width - 64, y);
      y += 36;
    }
    y += 10;
  }
  y = Math.max(y + 20, 1420);
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.strokeRect(64, y, 420, 180);
  ctx.strokeRect(width - 64 - 420, y, 420, 180);
  ctx.font = "22px Vazirmatn Variable";
  ctx.fillText("اثر انگشت", width - 80, y + 36);
  ctx.fillText("امضا", 468, y + 36);
  ctx.font = "20px Vazirmatn Variable";
  ctx.fillStyle = "#666";
  ctx.fillText("این برگه با امضا و اثر انگشت مشتری معتبر است.", width - 64, height - 48);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function ConsentBoard() {
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [placement, setPlacement] = useState("");
  const [sizeCm, setSizeCm] = useState("");
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
    if (!image) return toast.error("تصویر طرح را بگذار.");
    setBusy(true);
    try {
      const saved = await saveAction<{ code: string }>("saveStudioConsent", {
        customerName: name.trim(),
        nationalId: digitsOnly(nationalId),
        phone: normalized,
        placement: placement.trim(),
        sizeCm: sizeCm.trim(),
        designImage: image,
      });
      const record: ConsentRecord = {
        code: saved.code,
        customerName: name.trim(),
        nationalId: digitsOnly(nationalId),
        phone: normalized,
        placement: placement.trim(),
        sizeCm: sizeCm.trim(),
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
          <label className="text-sm">
            تصویر طرح
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void compressImage(file).then(setImage).catch((err) => toast.error(friendlyError(err)));
              }}
            />
          </label>
          {image ? <img src={image} alt="" className="h-36 w-36 rounded-xl object-cover" /> : null}
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
