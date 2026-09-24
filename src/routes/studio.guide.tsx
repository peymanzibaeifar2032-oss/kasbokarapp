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
          همین عکس‌ها را بخوان و بعد فرم را پر کن. بعد از ارسال، کد پیگیری را نگه دار و با همان
          وضعیت را ببین. جواب ممکن است کمی دیر بیاید چون هر جلسه حدود ۶ ساعت طول می‌کشد.
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

        <section className="mt-14 grid gap-4">
          <div>
            <p className="text-xs tracking-[.2em] text-[#b7955b]">روز قبل</p>
            <h2 className="mt-2 text-2xl font-black">آمادگی برای جلسه تاتو</h2>
            <p className="mt-2 max-w-2xl text-sm leading-8 text-white/60">
              از صبح روز قبل تا شب، همین کارها را انجام بده. اعلان گوشی هم یادت می‌آورد.
            </p>
          </div>
          <CareList
            items={[
              ["خواب و آب", "شب قبل زود بخواب. در طول روز آب زیاد بنوش تا پوست خشک نباشد."],
              ["غذا", "گرسنه نیا. یک وعده معمولی بخور، نه غذای خیلی سنگین درست قبل از نشستنت روی تخت."],
              ["الکل و انرژی‌زا", "از ۲۴ ساعت قبل الکل نخور. نوشیدنی انرژی‌زا و قهوه زیاد هم لازم نیست."],
              ["آفتاب", "پوست آفتاب‌سوخته تاتو نمی‌شود. اگر محل قرمز یا پوسته‌پوسته است، قبل از آمدن بگو."],
              ["تراشیدن", "خودت محل را نتراش. تیغ پوست را زخم می‌کند. اگر لازم باشد همان‌جا آماده می‌شود."],
              ["کرم", "صبح جلسه کرم چرب و ضخیم نزن. پوست باید تمیز باشد، نه لغزنده."],
              ["لباس", "لباس راحت بپوش که محل تاتو باز بماند و بعد از کار به پوست نساید."],
              ["دارو", "آسپرین و داروهای رقیق‌کننده خون را خودسر قطع نکن. اگر مصرف می‌کنی همان روز بگو."],
              ["حال عمومی", "اگر تب، سرماخوردگی یا جوش فعال روی همان محل داری، جلسه را جابه‌جا می‌کنیم."],
              ["ساعت", "سر وقت بیا. چند دقیقه زودتر کافی است. تلفنت را همراه داشته باش."],
            ]}
          />
        </section>

        <section className="mt-14 grid gap-4">
          <div>
            <p className="text-xs tracking-[.2em] text-[#b7955b]">بعد از کار</p>
            <h2 className="mt-2 text-2xl font-black">مراقبت از تاتو</h2>
            <p className="mt-2 max-w-2xl text-sm leading-8 text-white/60">
              این مراقبت‌ها همان چیزی است که بعد از اجرا باید رعایت کنی تا طرح تمیز بماند.
            </p>
          </div>
          <CareList
            items={[
              ["پانسمان", "چسب یا سلفون را تا همان زمانی که گفته شد باز نکن. زودتر کندن، رنگ را خراب می‌کند."],
              ["شستن", "بعد از باز کردن، با آب ولرم و صابون ملایم بدون عطر بشوی. کف دست تمیز باشد."],
              ["خشک کردن", "با دستمال تمیز فقط ضربه بزن. نکش و نساب."],
              ["پماد", "لایه خیلی نازک بزن. اگر براق و خیس ماند، زیاد زده‌ای."],
              ["خارش", "نخوران و پوسته را نکن. پوسته‌ای که خودش بیفتد، رنگ زیرش سالم‌تر است."],
              ["آب و گرما", "استخر، دریا، سونا، جکوزی و آفتاب مستقیم تا وقتی اجازه داده شد ممنوع است."],
              ["لباس و ورزش", "لباس تنگ و عرق سنگین روی کار نیاید. ورزش سنگین را یکی دو روز عقب بینداز."],
              ["خبر بده", "اگر قرمزی دور کار زیاد شد، چرک دیدی یا تب کردی، همان روز پیام بده. صبر نکن."],
            ]}
          />
        </section>
      </main>
    </div>
  );
}

function CareList({ items }: { items: [string, string][] }) {
  return (
    <ol className="grid gap-3">
      {items.map(([title, text]) => (
        <li key={title} className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
          <h3 className="font-bold text-[#e5d2ae]">{title}</h3>
          <p className="mt-2 text-sm leading-8 text-white/70">{text}</p>
        </li>
      ))}
    </ol>
  );
}
