import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { StudioTopBar } from "@/components/studio/top-bar";

const ALBUMS = "https://pin.it/5OMjDGMiD";

export const Route = createFileRoute("/studio/designs")({
  component: StudioDesignsPage,
  head: () => ({
    meta: [
      { title: "انتخاب طرح تاتو | پیمان زیبائی‌فر" },
      {
        name: "description",
        content: "آلبوم طرح‌های تاتو پیمان زیبائی‌فر. برای دیدن طرح‌ها وی‌پی‌ان را روشن کنید.",
      },
    ],
  }),
});

function StudioDesignsPage() {
  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
        <div>
          <p className="text-xs tracking-[.18em] text-[#b7955b]">FLASH</p>
          <h1 className="mt-2 text-3xl font-black">انتخاب طرح</h1>
        </div>
        <p className="rounded-2xl border border-[#b7955b]/40 bg-[#b7955b]/15 px-4 py-3 text-sm font-bold leading-7 text-[#f0e2c4]">
          برای دیدن طرح‌ها وی‌پی‌ان خود را روشن کنید
        </p>
        <section className="overflow-hidden rounded-3xl border border-white/15 bg-[#161616] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/[.04] px-3 py-2">
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="size-2.5 rounded-full bg-white/20" />
            <p className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-3 py-1.5 text-left text-xs text-white/70" dir="ltr">
              {ALBUMS}
            </p>
          </div>
          <a
            href={ALBUMS}
            className="flex min-h-[68vh] flex-col items-center justify-center gap-4 px-6 py-10 text-center"
          >
            <ExternalLink className="size-8 text-[#b7955b]" />
            <strong className="text-xl">نمایش همه آلبوم‌ها</strong>
            <span className="max-w-md text-sm leading-7 text-white/60">
              همین لینک پینترست باز می‌شود؛ همه دسته‌ها، طرح‌های تازه و طرح‌های مشابه، بدون محدودیت.
              عکس‌ها از سایت ما رد نمی‌شوند.
            </span>
          </a>
        </section>
      </main>
    </div>
  );
}
