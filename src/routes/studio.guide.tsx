import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { StudioGuideGallery } from "@/components/studio/guide-gallery";
import { StudioTopBar } from "@/components/studio/top-bar";

export const Route = createFileRoute("/studio/guide")({
  component: StudioGuidePage,
  head: () => ({
    meta: [
      { title: "آموزش رزرو نوبت تاتو | پیمان زیبائی‌فر" },
      {
        name: "description",
        content: "آموزش تصویری پر کردن فرم درخواست تاتو، ارسال عکس طرح و محل بدن، تأیید زمان و واریز بیعانه.",
      },
    ],
  }),
});

function StudioGuidePage() {
  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-xs tracking-[.2em] text-[#b7955b]">آموزش</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-black leading-[1.4] sm:text-5xl">
          چطور فرم نوبت تاتو را پر کنی؟
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-white/60">
          همین عکس‌ها را بخوان و بعد فرم را پر کن. اگر چیزی مبهم بود، اول اینجا را نگاه کن تا لازم
          نباشد از پیمان بپرسی.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/studio/request"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#b7955b] px-5 font-bold text-black"
          >
            برو به فرم درخواست
            <ArrowLeft className="size-4" />
          </Link>
        </div>

        <section className="mt-10">
          <StudioGuideGallery />
        </section>
      </main>
    </div>
  );
}
