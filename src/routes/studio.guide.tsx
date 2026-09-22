import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { StudioTopBar } from "@/components/studio/top-bar";
import { STUDIO_GUIDE_CARDS } from "@/lib/studio-guide";

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

        <section className="mt-10 grid gap-6 sm:grid-cols-2">
          {STUDIO_GUIDE_CARDS.map((card, index) => (
            <figure key={card.slug} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[.03]">
              <img
                src={`/studio-guide/${card.slug}.png`}
                alt={card.title}
                className="aspect-[4/5] w-full object-cover"
              />
              <figcaption className="p-4">
                <p className="text-xs text-[#b7955b]">مرحله {new Intl.NumberFormat("fa-IR").format(index + 1)}</p>
                <h2 className="mt-1 text-lg font-bold">{card.title}</h2>
                <p className="mt-2 text-sm leading-7 text-white/55">{card.lead}</p>
                <a
                  href={`/studio-guide/${card.slug}.png`}
                  download={`${card.slug}.png`}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-[#e5d2ae]"
                >
                  <Download className="size-4" />
                  ذخیره این عکس
                </a>
              </figcaption>
            </figure>
          ))}
        </section>
      </main>
    </div>
  );
}
