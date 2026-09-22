import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Instagram,
  MapPin,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { StudioTopBar } from "@/components/studio/top-bar";

export const Route = createFileRoute("/studio")({
  component: StudioLanding,
});

const services = [
  { title: "رئال و بلک‌اندگری", text: "طراحی اختصاصی با تمرکز بر کنتراست، جزئیات و هیلد تمیز." },
  { title: "کاور و بازطراحی", text: "بررسی تاتوی قبلی، فرم بدن و ساخت راه‌حل اجرایی برای پوشش حرفه‌ای." },
  { title: "مشاوره و آموزش", text: "مشاوره تخصصی طرح و دوره‌های آموزشی ساختاریافته برای هنرجویان." },
];

const steps = [
  ["۱", "ارسال درخواست", "عکس طرح، محل بدن، اندازه و توضیحاتت را ثبت کن."],
  ["۲", "بررسی و مشاوره", "امکان اجرا، زمان، تعداد جلسه و مبلغ بیعانه مشخص می‌شود."],
  ["۳", "تأیید پیشنهاد", "زمان پیشنهادی پیمان را تأیید کن، سپس بیعانه را واریز و رسید را ارسال کن."],
];

const faqs = [
  ["برای رزرو چه اطلاعاتی لازم است؟", "عکس واضح محل بدن، تصویر یا توضیح ایده، اندازه تقریبی و زمان‌های مناسب خودت را بفرست."],
  ["قیمت تاتو چطور مشخص می‌شود؟", "قیمت به اندازه، جزئیات، محل اجرا، وضعیت پوست و تعداد جلسه بستگی دارد و پس از بررسی اعلام می‌شود."],
  ["قبل از تاتو چه کار کنم؟", "خواب کافی داشته باش، آب بنوش، غذای مناسب بخور و از مصرف الکل و آفتاب‌سوختگی پرهیز کن."],
  ["بیعانه قابل بازگشت است؟", "شرایط جابه‌جایی و لغو نوبت پیش از پرداخت به‌صورت روشن نمایش داده می‌شود."],
];

function StudioLanding() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/studio") return <Outlet />;

  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar />

      <main id="top">
        <section className="relative isolate overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_24%,rgba(183,149,91,.18),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,.08),transparent_25%)]" />
          <div className="mx-auto grid min-h-[78vh] max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#b7955b]/35 bg-[#b7955b]/10 px-3 py-1.5 text-xs text-[#dbc08d]">
                <Sparkles className="size-3.5" />
                طراحی اختصاصی برای فرم بدن و داستان تو
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.35] sm:text-6xl">
                تاتو فقط یک تصویر نیست؛
                <span className="block text-[#b7955b]">بخشی از هویت تو است.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/62 sm:text-lg">
                طراحی و اجرای تخصصی تاتوهای رئال، بلک‌اندگری و کاور توسط پیمان زیبائی‌فر در کرمانشاه.
                مشاوره، ثبت نوبت و پیگیری کار در یک مسیر روشن و امن.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/studio/request"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-[#b7955b] px-6 font-bold text-black"
                >
                  <CalendarDays className="size-5" />
                  شروع ثبت نوبت
                </Link>
                <Link
                  to="/studio/status"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-[#b7955b]/40 px-6 text-sm text-[#e5d2ae]"
                >
                  بررسی وضعیت
                </Link>
                <Link
                  to="/studio/app"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-sm text-white/80"
                >
                  دانلود اپ اندروید
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/45">
                <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-[#b7955b]" />کرمانشاه</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#b7955b]" />رزرو با رسید</span>
                <span className="inline-flex items-center gap-2"><Instagram className="size-4 text-[#b7955b]" />@peyman_zibaeifar_tattoo</span>
              </div>
            </div>

            <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/12 bg-[#151517] shadow-2xl shadow-black">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(183,149,91,.22),transparent_34%),linear-gradient(145deg,#17171a,#09090a)]" />
              <div className="absolute inset-6 rounded-[2rem] border border-white/10" />
              <div className="absolute inset-0 grid place-items-center px-10 text-center">
                <div>
                  <span className="mx-auto grid size-16 place-items-center rounded-full border border-[#b7955b]/40 bg-[#b7955b]/10 text-[#b7955b]">
                    <Upload className="size-7" />
                  </span>
                  <p className="mt-5 font-semibold">محل نمایش نمونه‌کار شاخص</p>
                  <p className="mt-2 text-sm leading-6 text-white/42">عکس اصلی شما بدون برش نامناسب در این بخش قرار می‌گیرد.</p>
                </div>
              </div>
              <span className="absolute bottom-6 left-6 text-[10px] tracking-[.25em] text-white/30">PEYMAN ZIBAEIFAR</span>
            </div>
          </div>
        </section>

        <section id="work" className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-xs tracking-[.22em] text-[#b7955b]">تخصص‌ها</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-black sm:text-4xl">هر طرح برای یک بدن طراحی می‌شود</h2>
            <p className="max-w-md text-sm leading-7 text-white/50">کپی مستقیم از طرح دیگران انجام نمی‌شود. ایده با فرم بدن، پوست و محدودیت‌های اجرای واقعی هماهنگ می‌شود.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {services.map((item, index) => (
              <article key={item.title} className="group min-h-64 rounded-3xl border border-white/10 bg-white/[.035] p-6 transition hover:-translate-y-1 hover:border-[#b7955b]/45">
                <span className="text-5xl font-black text-white/[.07]">۰{index + 1}</span>
                <h3 className="mt-10 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/50">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="border-y border-white/10 bg-white/[.025]">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="text-3xl font-black">رزرو نوبت، بدون رفت‌وبرگشت اضافه</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map(([number, title, text]) => (
                <div key={number} className="rounded-3xl border border-white/10 bg-[#0b0b0c] p-6">
                  <span className="grid size-10 place-items-center rounded-full bg-[#b7955b] font-black text-black">{number}</span>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/50">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 rounded-3xl border border-[#b7955b]/25 bg-[#b7955b]/[.07] p-5 sm:grid-cols-3">
              <Mini icon={Upload} label="آپلود طرح و محل بدن" />
              <Mini icon={Clock3} label="تأیید زمان پیشنهادی پیمان" />
              <Mini icon={CircleDollarSign} label="پرداخت بیعانه و رسید" />
            </div>
          </div>
        </section>

        <section id="care" className="mx-auto grid max-w-6xl gap-4 px-4 py-20 md:grid-cols-2">
          <CareCard title="پیش از تاتو" points={["خواب و تغذیه کافی", "آبرسانی مناسب پوست", "پرهیز از الکل و آفتاب‌سوختگی", "اعلام بیماری یا داروی مؤثر"]} />
          <CareCard title="پس از تاتو" points={["شست‌وشوی درست طبق آموزش", "استفاده محدود از محصول توصیه‌شده", "پرهیز از استخر، آفتاب و اصطکاک", "تماس در صورت نشانه غیرعادی"]} />
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 pb-24">
          <h2 className="text-center text-3xl font-black">سؤالات متداول</h2>
          <div className="mt-8 divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-white/[.025]">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group p-5 open:bg-white/[.025]">
                <summary className="flex list-none items-center justify-between gap-4 font-semibold">
                  {question}
                  <ChevronDown className="size-5 shrink-0 text-[#b7955b] transition group-open:rotate-180" />
                </summary>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/52">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#b7955b] text-black">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-black">برای طرح خودت آماده‌ای؟</h2>
              <p className="mt-2 text-sm text-black/65">درخواست را ثبت کن تا پس از بررسی، زمان و هزینه اعلام شود.</p>
            </div>
            <Link to="/studio/request" className="inline-flex h-12 items-center gap-2 rounded-full bg-black px-6 font-bold text-white">
              ثبت درخواست اولیه
              <ArrowLeft className="size-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs text-white/40">
        پیمان زیبائی‌فر · تاتو آرتیست و مدرس · کرمانشاه
      </footer>
    </div>
  );
}

function Mini({ icon: Icon, label }: { icon: typeof Upload; label: string }) {
  return <span className="flex items-center gap-3 text-sm"><Icon className="size-5 text-[#b7955b]" />{label}</span>;
}

function CareCard({ title, points }: { title: string; points: string[] }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[.035] p-7">
      <h2 className="text-2xl font-black">{title}</h2>
      <ul className="mt-6 grid gap-4">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-3 text-sm text-white/60">
            <CheckCircle2 className="size-5 shrink-0 text-[#b7955b]" />
            {point}
          </li>
        ))}
      </ul>
    </article>
  );
}
