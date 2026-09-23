import { createFileRoute } from "@tanstack/react-router";
import { Download, ShieldCheck, Smartphone } from "lucide-react";
import { StudioTopBar } from "@/components/studio/top-bar";

export const Route = createFileRoute("/studio/app")({
  component: StudioAppDownload,
  head: () => ({
    meta: [
      { title: "دانلود اپ رزرو وقت تاتو | پیمان زیبائی‌فر" },
      {
        name: "description",
        content: "دانلود مستقیم اپ اندروید رزرو وقت تاتو برای نصب روی گوشی، بدون فروشگاه.",
      },
    ],
  }),
});

function StudioAppDownload() {
  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />

      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs tracking-[.2em] text-[#b7955b]">ANDROID APP</p>
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
            <p className="mt-2 text-sm text-white/50">نسخه ۱.۸ · آخرین نسخه · نصب مستقیم روی گوشی</p>
          </div>
        </div>

        <p className="mt-6 max-w-xl text-sm leading-8 text-white/62">
          این اپ همان فرم رزرو استودیو را روی صفحه اصلی گوشی می‌گذارد. از پلی‌استور نیست؛ فایل را از
          همین صفحه دانلود و نصب کن. نسخه ۱.۸ ایمیل و رمز موفق را روی همین گوشی نگه می‌دارد و دفعهٔ بعد خودش پر می‌کند.
        </p>

        <a
          href="/api/tattoo-apk?v=9"
          download="rezerv-vaght-tatoo.apk"
          className="mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-[#b7955b] px-6 text-base font-black text-black"
        >
          <Download className="size-5" />
          دانلود فایل نصب اندروید
        </a>
        <p className="mt-3 text-xs text-white/40">حجم کم · اندروید ۸ به بالا</p>

        <ol className="mt-10 grid gap-4">
          {[
            ["۱", "دانلود", "دکمه طلایی را بزن. اگر مرورگر گفت فایل ناشناس است، گزینه دانلود را تأیید کن."],
            ["۲", "اجازه نصب", "روی فایل بزن. اگر گوشی گفت «منبع ناشناس»، برای همین مرورگر اجازه نصب بده."],
            ["۳", "ورود و فرم", "اپ «رزرو وقت تاتو» باز می‌شود. وارد حساب شو، عکس طرح و محل بدن را بفرست."],
          ].map(([n, title, text]) => (
            <li key={n} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[.03] p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#b7955b] font-black text-black">
                {n}
              </span>
              <div>
                <h2 className="font-bold">{title}</h2>
                <p className="mt-1 text-sm leading-7 text-white/55">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-3 text-sm text-white/45 sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <Smartphone className="size-4 text-[#b7955b]" />
            فقط اندروید؛ برای آیفون از نسخه وب استفاده کنید
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
