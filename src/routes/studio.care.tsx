import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { StudioTopBar } from "@/components/studio/top-bar";

export const Route = createFileRoute("/studio/care")({
  component: StudioCarePage,
  head: () => ({
    meta: [
      { title: "مراقبت قبل و بعد از تاتو | پیمان زیبائی‌فر" },
      {
        name: "description",
        content: "آمادگی قبل از جلسه، مهار درد، اثر رنگ پوست، و مراقبت زخم و ریزش رنگ بعد از تاتو.",
      },
    ],
  }),
});

const jumps = [
  ["#before", "قبل از تاتو"],
  ["#pain", "مهار درد"],
  ["#skin", "پوست و رنگ"],
  ["#after", "بعد از تاتو"],
  ["#heal", "زخم و ریزش"],
  ["#when", "چه وقت مجاز است"],
];

function StudioCarePage() {
  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs tracking-[.2em] text-[#b7955b]">مراقبت</p>
        <h1 className="mt-3 text-3xl font-black leading-[1.45] sm:text-5xl">قبل و بعد از تاتو، مرحله به مرحله</h1>
        <p className="mt-4 text-sm leading-8 text-white/65">
          این را یک بار تا آخر بخوان. همان کاری است که از دو روز قبل از جلسه تا حدود یک ماه بعد باید انجام بدهی.
          لازم نیست هر کدام را جداگانه بپرسی.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {jumps.map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-white/15 px-4 py-2 text-sm text-[#e5d2ae]">
              {label}
            </a>
          ))}
        </div>

        <Section
          id="before"
          kicker="قبل از جلسه"
          title="از دو روز قبل تا نشستن روی تخت"
          lead="به همین ترتیب پیش برو. پوست آماده هم درد را کمتر می‌کند هم رنگ را بهتر نگه می‌دارد."
        >
          <Step n="۱" title="از دو روز قبل">
            <Item title="آب">در این روزها آب کافی بنوش. پوست خشک هم تحمل را پایین می‌آورد هم ترمیم را کند می‌کند.</Item>
            <Item title="مرطوب‌کننده">اگر پوستت خشک است، شب‌ها کمی کرم بدون عطر بزن. صبح جلسه و هنگام اجرا روی پوست نباشد.</Item>
            <Item title="آفتاب">آفتاب و سولاریوم نرو. پوست سوخته، قرمز یا پوسته‌پوسته تاتو نمی‌شود. اگر این‌طور است قبل از آمدن بگو.</Item>
            <Item title="پوست ناسالم">روی جوش فعال، التهاب، چربی غلیظ یا پوست عفونی کار نمی‌شود.</Item>
          </Step>
          <Step n="۲" title="شب قبل">
            <Item title="خواب">زود بخواب. خستگی درد را بیشتر می‌کند.</Item>
            <Item title="الکل">از ۲۴ ساعت قبل الکل نخور. نوشیدنی انرژی‌زا هم لازم نیست.</Item>
            <Item title="تراشیدن">محل را خودت نتراش. تیغ پوست را زخم می‌کند. اگر لازم باشد همان‌جا آماده می‌شود.</Item>
            <Item title="لباس">لباس آزاد بپوش که محل تاتو باز بماند و بعد از کار به پوست نساید.</Item>
          </Step>
          <Step n="۳" title="صبح جلسه">
            <Item title="غذا">یک تا دو ساعت قبل غذای سبک بخور. گرسنه نیا و درست قبل از کار هم غذای سنگین نخور.</Item>
            <Item title="کرم">صبح کرم چرب و ضخیم نزن. پوست باید تمیز باشد، نه لغزنده.</Item>
            <Item title="دارو">آسپرین و داروی رقیق‌کننده خون را خودسر قطع نکن. اگر مصرف می‌کنی همان روز بگو.</Item>
            <Item title="حال عمومی">تب، سرماخوردگی یا جوش روی همان محل یعنی جلسه را جابه‌جا می‌کنیم.</Item>
            <Item title="ساعت">سر وقت بیا. تلفنت را همراه داشته باش.</Item>
          </Step>
        </Section>

        <Section
          id="pain"
          kicker="مهار درد"
          title="چه چیزی تحمل را بهتر می‌کند"
          lead="این کارها برای خیلی‌ها درد را قابل‌تحمل‌تر می‌کند. اثرش برای همه یکسان نیست و هیچ درصدی تضمین نمی‌شود."
        >
          <ul className="grid gap-3">
            {[
              "خواب کافی شب قبل، مهم‌ترین کار است.",
              "آب کافی در ۲۴ ساعت قبل، پوست را آماده‌تر می‌کند.",
              "غذای سبک بخور. نه گرسنه باش و نه سنگین.",
              "قبل از شروع چند دقیقه بنشین. دم را کوتاه و بازدم را بلندتر بگیر.",
              "جلسه‌های طولانی به‌خاطر جمع شدن التهاب سخت‌تر می‌شوند. اگر جایی غیرقابل‌تحمل شد همان لحظه بگو تا توقف کوتاه باشد.",
              "کرم بی‌حسی را خودت نخر و نزن. پوست را عوض می‌کند و فقط اگر هماهنگ شده باشد استفاده می‌شود.",
            ].map((line) => (
              <li key={line} className="rounded-3xl border border-white/10 bg-white/[.03] p-4 text-sm leading-8 text-white/75">
                {line}
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="skin"
          kicker="پوست و رنگ"
          title="چرا یک رنگ روی پوست تو طور دیگری دیده می‌شود"
          lead="یک طرح روی پوست روشن، گندمی و تیره یکسان درنمی‌آید. ملاک اسم رنگ نیست. روشن یا تیره بودن آن نسبت به پوست خودت مهم است."
        >
          <div className="grid gap-3">
            <Tone title="پوست روشن" text="اختلاف رنگ با زمینه بیشتر دیده می‌شود و نتیجه قابل‌پیش‌بینی‌تر است. باز هم رنگ نهایی را بعد از ترمیم ببین، نه در عکس همان روز." />
            <Tone title="پوست گندمی" text="رنگ‌ها زنده‌اند، به شرطی که بینشان فاصله باشد و فضای خالی طرح را له نکند." />
            <Tone title="پوست تیره" text="رنگ خوانا می‌ماند، ولی فرم، کنتراست و فضای خالی از شلوغ کردن تعداد رنگ مهم‌تر است." />
          </div>
          <div className="mt-4 rounded-3xl border border-white/10 bg-white/[.03] p-5 text-sm leading-8 text-white/75">
            <p>رنگ در لایه میانی پوست می‌نشیند، نه روی سطح. برای همین عکس تازه ملاک ترمیم نیست.</p>
            <p className="mt-3">اگر رنگ خیلی سطحی بماند، با پوسته‌ای که می‌ریزد می‌رود. اگر بیش از حد عمیق برود، پخش می‌شود. این عمق را آرتیست تنظیم می‌کند. تو با کندن پوسته خرابش نکن.</p>
            <p className="mt-3">فضای خالی بین خطوط را بعداً پر نخواه. همان فاصله است که طرح بعد از جا افتادن خوانا می‌ماند.</p>
          </div>
        </Section>

        <Section
          id="after"
          kicker="بعد از کار"
          title="همان روز و روزهای اول"
          lead="ملاک، شمردن روز نیست. سطح پوست باید کاملاً بسته باشد: بدون زخم، دلمه، خون، ترشح یا قرمزی."
        >
          <Step n="۱" title="همان روز">
            <Item title="پانسمان">چسب یا سلفون را تا همان زمانی که گفته شد باز نکن. زودتر کندن، رنگ را خراب می‌کند.</Item>
            <Item title="دوش">دوش کوتاه و ولرم معمولاً همان روز یا فردا اشکالی ندارد. آب را مستقیم و با فشار روی تاتو نگیر.</Item>
          </Step>
          <Step n="۲" title="روز اول تا سوم">
            <Item title="التهاب">قرمزی، حساسیت و کمی تورم در این روزها طبیعی است.</Item>
            <Item title="شستن">بعد از باز کردن پانسمان، با آب ولرم و شوینده ملایم بدون عطر بشوی. از صابون قوی، قلیایی و مواد معطر استفاده نکن. سد پوست را خراب می‌کند و ترمیم کند می‌شود.</Item>
            <Item title="خشک کردن">با دستمال تمیز فقط ضربه بزن. نکش و نساب.</Item>
            <Item title="مراقبت">محصولی که گفته شده را خیلی نازک بزن. اگر سطح براق و خیس ماند، زیاد زده‌ای.</Item>
          </Step>
        </Section>

        <Section
          id="heal"
          kicker="زخم و ریزش"
          title="روز سوم تا حدود دو هفته"
          lead="در این فاصله پوسته می‌آید و رنگ سطح کمی می‌ریزد. این ریزش اگر پوسته را نکنی، رنگ اصلی را با خودش نمی‌برد."
        >
          <ul className="grid gap-3">
            {[
              ["نکن", "پوسته را نکن، نخار و نمال. پوسته‌ای که خودش بیفتد، رنگ زیرش سالم‌تر است."],
              ["ترشح", "ترشح شفاف و کم در روزهای اول می‌تواند باشد. ترشح زرد یا سبز، بوی بد، قرمزی که هر روز پهن‌تر می‌شود یا تب را همان روز خبر بده."],
              ["لباس", "لباس تنگ و عرق سنگین روی کار نیاید."],
              ["جا افتادن", "بعد از بسته شدن سطح، رنگ هنوز در حال جا افتادن است. نتیجه نهایی را حدود یک تا سه ماه بعد ببین، نه هفته اول."],
              ["آفتاب", "آفتاب مستقیم تا چند هفته ممنوع است. بعد از بسته شدن سطح، لباس پوشیده و ضدآفتاب مناسب."],
            ].map(([title, text]) => (
              <li key={title} className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
                <h3 className="font-bold text-[#e5d2ae]">{title}</h3>
                <p className="mt-2 text-sm leading-8 text-white/75">{text}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="when"
          kicker="تقویم"
          title="از کی دوباره مجاز است"
          lead="اگر بین این زمان و وضعیت پوستت فرق بود، پوست را ملاک بگیر نه عدد روز را."
        >
          <div className="grid gap-3">
            {[
              ["دوش کوتاه و ولرم", "معمولاً همان روز یا فردا. آب با فشار مستقیم روی تاتو نریزد."],
              ["وان و خوابیدن در آب", "تا بسته شدن سطح ممنوع است. معمولاً ۳ تا ۴ هفته."],
              ["ورزش سبک", "بعد از کم شدن قرمزی. اگر درد، التهاب یا ترشح برگشت، قطع کن."],
              ["ورزش سنگین و عرق زیاد", "حداقل ۱ تا ۲ هفته صبر کن."],
              ["اگر محل تاتو در تماس است", "بعد از کم شدن التهاب، ۱ تا ۲ هفته. اصطکاک، فشار و عرق روی کار نباشد."],
              ["استخر، دریا، سونا و جکوزی", "معمولاً ۳ تا ۴ هفته، تا سطح کاملاً بسته شود."],
              ["آفتاب و سولاریوم", "هفته‌های اول کاملاً ممنوع. بعد از ترمیم: پوشش و ضدآفتاب."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-8 text-white/70">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-3xl border border-[#b7955b]/30 bg-[#b7955b]/10 p-5 text-sm leading-8 text-[#e5d2ae]">
            اگر شک کردی، کار سخت‌گیرانه‌تر را انجام بده. نشانه غیرعادی را در وضعیت نوبت بنویس و صبر نکن.
          </p>
          <Link
            to="/studio/status"
            className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-[#b7955b] text-sm font-bold text-black"
          >
            رفتن به وضعیت نوبت
          </Link>
        </Section>
      </main>
    </div>
  );
}

function Section({
  id,
  kicker,
  title,
  lead,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-24">
      <p className="text-xs tracking-[.2em] text-[#b7955b]">{kicker}</p>
      <h2 className="mt-2 text-2xl font-black leading-snug">{title}</h2>
      <p className="mt-3 text-sm leading-8 text-white/60">{lead}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className="mb-4 rounded-3xl border border-white/10 bg-white/[.03] p-5">
      <h3 className="flex items-center gap-3 text-lg font-black">
        <span className="grid size-8 place-items-center rounded-full bg-[#b7955b] text-sm text-black">{n}</span>
        {title}
      </h3>
      <div className="mt-4 grid gap-4">{children}</div>
    </div>
  );
}

function Item({ title, children }: { title: string; children: ReactNode }) {
  return (
    <p className="text-sm leading-8 text-white/75">
      <strong className="text-[#e5d2ae]">{title}. </strong>
      {children}
    </p>
  );
}

function Tone({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-8 text-white/70">{text}</p>
    </article>
  );
}
