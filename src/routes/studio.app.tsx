import { createFileRoute } from "@tanstack/react-router";
import { Download, Share, ShieldCheck, Smartphone } from "lucide-react";
import { StudioTopBar } from "@/components/studio/top-bar";

export const Route = createFileRoute("/studio/app")({
  component: StudioAppDownload,
  head: () => ({
    meta: [
      { title: "نصب اپ رزرو وقت تاتو | پیمان زیبائی‌فر" },
      {
        name: "description",
        content: "دانلود اپ اندروید یا افزودن به صفحه اصلی آیفون از سافاری.",
      },
    ],
  }),
});

function StudioAppDownload() {
  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />

      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs tracking-[.2em] text-[#b7955b]">INSTALL</p>
        <div className="mt-5 flex items-start gap-4">
          <img
            src="/apps/tattoo-app-icon.png"
            alt=""
            width={72}
            height={72}
            className="size-[72px] rounded-2xl border border-[#b7955b]/30 bg-black"
          />
          <div>
            <h1 className="text-3xl font-black leading-[1.4] sm:text-4xl">رزرو وقت تاتو</h1>
            <p className="mt-2 text-sm text-white/50">اندروید با فایل نصب · آیفون از سافاری، افزودن به صفحه اصلی</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
            <h2 className="font-black">اندروید</h2>
            <p className="mt-2 text-sm leading-7 text-white/55">فایل نصب را دانلود کن. از پلی‌استور نیست.</p>
            <a
              href="/api/tattoo-apk?v=11"
              download="rezerv-vaght-tatoo.apk"
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-[#b7955b] px-5 text-sm font-black text-black"
            >
              <Download className="size-4" />
              دانلود فایل نصب اندروید
            </a>
          </section>
          <section id="iphone" className="rounded-3xl border border-[#b7955b]/30 bg-[#b7955b]/10 p-5">
            <h2 className="font-black">آیفون</h2>
            <p className="mt-2 text-sm leading-7 text-white/70">فروشگاه اپل لازم نیست. از سافاری به صفحه اصلی اضافه کن.</p>
            <a
              href="#iphone-steps"
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-full border border-[#b7955b]/50 px-5 text-sm font-bold text-[#f0e2c4]"
            >
              <Share className="size-4" />
              افزودن به صفحه اصلی
            </a>
          </section>
        </div>

        <h2 className="mt-10 text-lg font-black">نصب اندروید</h2>
        <ol className="mt-4 grid gap-4">
          {[
            ["۱", "دانلود", "دکمه دانلود اندروید را بزن. اگر مرورگر گفت فایل ناشناس است، دانلود را تأیید کن."],
            ["۲", "اجازه نصب", "روی فایل بزن. اگر گوشی گفت «منبع ناشناس»، برای همین مرورگر اجازه نصب بده."],
            ["۳", "فرم", "اپ «رزرو وقت تاتو» باز می‌شود. عکس طرح و محل بدن را بفرست."],
          ].map(([n, title, text]) => (
            <li key={n} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[.03] p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#b7955b] font-black text-black">
                {n}
              </span>
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-7 text-white/55">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 id="iphone-steps" className="mt-10 text-lg font-black">نصب آیفون با سافاری</h2>
        <ol className="mt-4 grid gap-4">
          {[
            ["۱", "سافاری", "این صفحه را در Safari باز کن. اگر از اینستاگرام آمده‌ای، منو را بزن و «Open in Safari» را انتخاب کن."],
            ["۲", "اشتراک", "دکمه اشتراک‌گذاری را بزن؛ مربع با فلش رو به بالا، پایین صفحه."],
            ["۳", "صفحه اصلی", "در فهرست، «Add to Home Screen» یا «افزودن به صفحه اصلی» را بزن و اضافه کردن را تأیید کن."],
          ].map(([n, title, text]) => (
            <li key={`ios-${n}`} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[.03] p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#b7955b] font-black text-black">
                {n}
              </span>
              <div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-7 text-white/55">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-3 text-sm text-white/45 sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <Smartphone className="size-4 text-[#b7955b]" />
            آیفون فروشگاه ندارد؛ فقط افزودن به صفحه اصلی
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#b7955b]" />
            اینترنت لازم است؛ نوبت روی سرور استودیو ذخیره می‌شود
          </p>
        </div>
      </main>
    </div>
  );
}
