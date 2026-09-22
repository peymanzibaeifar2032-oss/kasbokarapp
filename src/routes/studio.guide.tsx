import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { StudioGuideGrid } from "@/components/studio/guide-cards";
import { STUDIO_GUIDE_CARDS } from "@/lib/studio-guide";

type GuideSearch = { export?: string };

export const Route = createFileRoute("/studio/guide")({
  validateSearch: (search: Record<string, unknown>): GuideSearch => ({
    export: typeof search.export === "string" ? search.export : undefined,
  }),
  component: StudioGuidePage,
  head: () => ({
    meta: [
      { title: "راهنمای رزرو نوبت تاتو | پیمان زیبائی‌فر" },
      {
        name: "description",
        content: "آموزش مرحله‌به‌مرحله پر کردن فرم درخواست تاتو، ارسال عکس طرح و محل بدن، تأیید زمان و واریز بیعانه.",
      },
    ],
  }),
});

function StudioGuidePage() {
  const { export: exportMode } = Route.useSearch();
  const isExport = exportMode === "1";

  if (isExport) {
    return (
      <div className="min-h-dvh bg-black" dir="rtl">
        <style>{`
          body .pointer-events-none.fixed { display: none !important; }
          [data-sonner-toaster] { display: none !important; }
        `}</style>
        <StudioGuideGrid size="share" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <header className="border-b border-white/10 bg-[#0b0b0c]/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/studio" className="leading-tight">
            <strong className="block text-sm">پیمان زیبائی‌فر</strong>
            <span className="text-[11px] text-white/45">آموزش فرم رزرو</span>
          </Link>
          <Link to="/studio/request" className="flex items-center gap-1 text-sm text-[#dbc08d]">
            باز کردن فرم
            <ArrowLeft className="size-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-xs tracking-[.2em] text-[#b7955b]">CUSTOMER GUIDE</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-black leading-[1.4] sm:text-5xl">
          چطور فرم نوبت تاتو را پر کنی؟
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
          این همان فرم «درخواست بررسی پروژه تاتو» است. عکس‌ها را برای اینستاگرام و واتساپ هم
          می‌توانی ذخیره کنی و برای مشتری بفرستی.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/studio/request"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#b7955b] px-5 font-bold text-black"
          >
            برو به فرم درخواست
            <ArrowLeft className="size-4" />
          </Link>
          <button
            type="button"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-sm"
            onClick={() => {
              const url = `${window.location.origin}/studio/guide`;
              if (navigator.share) {
                void navigator.share({
                  title: "راهنمای رزرو نوبت تاتو",
                  url,
                });
                return;
              }
              void navigator.clipboard.writeText(url);
            }}
          >
            <Share2 className="size-4" />
            فرستادن لینک آموزش
          </button>
        </div>

        <section className="mt-10">
          <StudioGuideGrid />
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[.03] p-5 sm:p-8">
          <h2 className="text-xl font-black">دانلود تصویرها برای اینستاگرام و واتساپ</h2>
          <p className="mt-2 text-sm leading-7 text-white/50">
            هر کارت را جدا ذخیره کن و به‌صورت آلبوم برای مشتری بفرست.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STUDIO_GUIDE_CARDS.map((card, index) => (
              <a
                key={card.slug}
                href={`/studio-guide/${card.slug}.png`}
                download={`${card.slug}.png`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b0b0c] px-4 py-3 text-sm"
              >
                <span>
                  <span className="text-[#b7955b]">{new Intl.NumberFormat("fa-IR").format(index + 1)}. </span>
                  {card.title}
                </span>
                <Download className="size-4 text-[#b7955b]" />
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
