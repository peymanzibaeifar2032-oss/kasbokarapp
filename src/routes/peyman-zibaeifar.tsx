import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Calendar, Download, ExternalLink, Instagram, MessageCircle, Phone, Send, Sparkles } from "lucide-react";
import { Shell } from "@/components/layout/shell";

export const Route = createFileRoute("/peyman-zibaeifar")({
  head: () => ({
    meta: [
      {
        title: "پیمان زیبائی فر | تاتو آرتیست کرمانشاه - مقام سوم آلانیا ۲۰۲۱",
      },
      {
        name: "description",
        content:
          "پیمان زیبائی فر – تاتو آرتیست حرفه‌ای کرمانشاه. بیش از یک دهه تجربه، مقام سوم مسابقات بین‌المللی تاتو آلانیا ۲۰۲۱ (Cleopatra Ink). سازنده اپلیکیشن‌های تقویم نوبت و آموزش تاتو. طراحی رئال، بلک‌اندگری، کاور و مینیمال. رزرو نوبت و مشاوره.",
      },
      { property: "og:title", content: "پیمان زیبائی فر | تاتو آرتیست کرمانشاه" },
      {
        property: "og:description",
        content: "تاتو آرتیست کرمانشاه با بیش از یک دهه تجربه. مقام سوم آلانیا ۲۰۲۱. سازنده اپ‌های تخصصی تاتو.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "پیمان زیبائی فر | تاتو آرتیست کرمانشاه" },
    ],
  }),
  component: PeymanBio,
});

const PHONE = "09216812852";
const PHONE_FA = "۰۹۲۱۶۸۱۲۸۵۲";
const WA = `https://wa.me/98${PHONE.slice(1)}`;
const IG = "https://www.instagram.com/peyman_zibaeifar_tattoo/";
const TG = "https://t.me/Peyman_ART";
const PINTEREST = "https://pin.it/5OMjDGMiD";
const DHA = "https://www.dha.com.tr/gundem/dovme-sanatcilari-yaristi-1870315";

function PeymanBio() {
  return (
    <Shell>
      <div className="mx-auto max-w-4xl pb-10">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 p-6 text-white shadow-xl sm:p-10">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 size-72 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
              <Award className="size-3.5" />
              مقام سوم مسابقات بین‌المللی تاتو آلانیا ۲۰۲۱
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-5xl">پیمان زیبائی‌فر</h1>
            <p className="mt-2 text-lg font-medium text-white/90 sm:text-xl">تاتو آرتیست حرفه‌ای کرمانشاه</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
              بیش از یک دهه تجربه در طراحی و اجرای تاتوهای اختصاصی. از مسیر یادگیری و مسابقات بین‌المللی تا ساخت اپلیکیشن‌های تخصصی برای هنرمندان تاتو.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={IG} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-teal-700 shadow-md hover:bg-white/90">
                <Instagram className="size-4" /> اینستاگرام
              </a>
              <a href={WA} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-600">
                <MessageCircle className="size-4" /> واتساپ
              </a>
              <a href={TG} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-sky-600">
                <Send className="size-4" /> تلگرام
              </a>
            </div>
          </div>
        </div>

        {/* Biography FA */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="size-6 text-teal-600" />
            مسیر و زندگی‌نامه
          </h2>
          <div className="mt-4 space-y-4 text-base leading-8 text-fg/90">
            <p>
              پیمان زیبائی‌فر، تاتوآرتیست کرمانشاهی با بیش از یک دهه تجربه مستمر است. او از سال‌های نوجوانی به طراحی و هنرهای تجسمی علاقه داشت و این علاقه به‌تدریج به سمت تاتو هدایت شد. با تمرین مداوم روی پوست مصنوعی، مطالعه تکنیک‌های رئال و بلک‌اندگری، و کار در استودیوهای حرفه‌ای، مسیر خود را به‌عنوان هنرمند مستقل ساخت.
            </p>
            <p>
              هر طرح را بر اساس فرم بدن، داستان شخصی و نیاز مشتری طراحی می‌کند و با رعایت کامل بهداشت و استانداردهای حرفه‌ای اجرا می‌نماید. تجربه او شامل اجرا در استودیوهای ترکیه، حضور در مسابقات بین‌المللی و طراحی اختصاصی برای مشتریان ایرانی و خارجی است.
            </p>
            <p>
              علاوه بر کار هنری، پیمان به ساخت ابزارهای دیجیتال برای جامعه تاتو نیز پرداخته است. او اپلیکیشن‌های تخصصی برای مدیریت نوبت و آموزش تاتو طراحی و منتشر کرده تا هنرمندان و هنرجویان بتوانند کار خود را حرفه‌ای‌تر و منظم‌تر پیش ببرند.
            </p>
          </div>
        </section>

        {/* English Bio */}
        <section className="mt-8 rounded-2xl border border-teal-200 bg-teal-50/50 p-5 dark:border-teal-900 dark:bg-teal-950/30">
          <h2 className="text-xl font-bold text-teal-800 dark:text-teal-200">Biography (English)</h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-fg/90" dir="ltr">
            <p>
              Peyman Zibaeifar is a professional tattoo artist based in Kermanshah, Iran, with over a decade of continuous experience. From an early interest in visual arts and design, he dedicated himself to realistic and black & grey tattooing through persistent practice on synthetic skin, technical study, and work in professional studios.
            </p>
            <p>
              He creates custom designs tailored to each client’s body form, personal story, and needs, while strictly following hygiene and professional standards. His background includes work in Turkish studios, participation in international competitions, and custom projects for Iranian and international clients.
            </p>
            <p>
              Beyond tattooing, Peyman has developed specialized digital tools for the tattoo community, including appointment calendar and tattoo education applications, to help artists and students manage their work more professionally.
            </p>
          </div>
        </section>

        {/* Achievements */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Award className="size-6 text-amber-500" />
            افتخارات بین‌المللی
          </h2>
          <div className="mt-4 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-50 to-orange-50 p-6 dark:from-amber-950/40 dark:to-orange-950/30">
            <h3 className="text-lg font-bold">مقام سوم سبک مینیمال – Cleopatra Ink Life Tattoo Gallery ۲۰۲۱</h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              آلانیا، ترکیه – دسامبر ۲۰۲۱. این مسابقه بین‌المللی توسط رسانه‌های ترکیه از جمله DHA و CNN Türk پوشش داده شد.
            </p>
            <a
              href={DHA}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
            >
              گزارش کامل DHA
              <ExternalLink className="size-4" />
            </a>
            <p className="mt-3 text-xs text-muted" dir="ltr">
              3rd Place in Minimal Category at Cleopatra Ink Life Tattoo Gallery 2021, Alanya, Turkey.
            </p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-fg/80">
            <li>• سابقه اجرا در استودیوهای حرفه‌ای ترکیه</li>
            <li>• حضور در مسابقات بین‌المللی تاتو مارماریس</li>
            <li>• طراحی اختصاصی برای مشتریان ایرانی و بین‌المللی</li>
          </ul>
        </section>

        {/* Styles */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold">سبک‌های تخصصی</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["رئال و پرتره", "جزئیات دقیق، کنتراست بالا و شباهت واقعی"],
              ["بلک‌اندگری", "سایه‌های نرم، عمق و حس هنری"],
              ["کاور و بازطراحی", "پوشش حرفه‌ای تاتوهای قبلی"],
              ["مینیمال و فاین‌لاین", "خطوط ظریف و طرح‌های ساده و شیک"],
              ["طراحی شخصی", "بر اساس فرم بدن و داستان مشتری"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-border bg-surface p-4">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Apps */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Calendar className="size-6 text-blue-600" />
            اپلیکیشن‌های ساخته‌شده برای تاتو
          </h2>
          <p className="mt-2 text-sm text-muted">
            ابزارهای تخصصی که پیمان برای هنرمندان و هنرجویان تاتو طراحی و منتشر کرده است.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <AppCard
              title="تقویم نوبت رنگی"
              titleEn="Colorful Appointment Calendar"
              desc="اپلیکیشن مدیریت نوبت‌های تاتو با تقویم شمسی، ثبت اطلاعات مشتری، سبک کار، محل بدن و وضعیت پرداخت. مناسب برای استودیوها و هنرمندان مستقل."
              href="/downloads/taghvim-nobat-colorful-1.15.3-test.apk"
              color="from-blue-500 to-cyan-500"
            />
            <AppCard
              title="آموزش تاتو رنگی (TattooHub)"
              titleEn="Tattoo Education App"
              desc="اپلیکیشن آموزشی ساختاریافته برای یادگیری اصول تاتو، تکنیک‌ها، بهداشت و مسیر حرفه‌ای شدن. مناسب هنرجویان و علاقه‌مندان."
              href="/downloads/tattoohub-1.2.1.apk"
              color="from-violet-500 to-fuchsia-500"
            />
          </div>
        </section>

        {/* Gallery */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold">گالری نمونه کارها</h2>
          <p className="mt-2 text-sm text-muted">
            برای دیدن طرح‌ها و کارهای اجراشده، اینستاگرام و آلبوم پینترست را ببینید.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <GalleryCard label="رئال و پرتره" href={IG} />
            <GalleryCard label="بلک‌اندگری" href={IG} />
            <GalleryCard label="کاور و بازطراحی" href={IG} />
            <GalleryCard label="مینیمال" href={IG} />
            <GalleryCard label="آلبوم پینترست" href={PINTEREST} external />
            <GalleryCard label="اینستاگرام" href={IG} external />
          </div>
        </section>

        {/* Contact */}
        <section className="mt-12 rounded-3xl border border-border bg-gradient-to-br from-surface to-teal-50/30 p-6 dark:from-surface dark:to-teal-950/20">
          <h2 className="text-2xl font-bold">راه‌های ارتباطی</h2>
          <p className="mt-1 text-sm text-muted">برای مشاوره، نوبت‌دهی و همکاری</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ContactLink href={`tel:+98${PHONE.slice(1)}`} icon={Phone} label="تماس" value={PHONE_FA} />
            <ContactLink href={WA} icon={MessageCircle} label="واتساپ" value={PHONE_FA} />
            <ContactLink href={IG} icon={Instagram} label="اینستاگرام" value="@peyman_zibaeifar_tattoo" />
            <ContactLink href={TG} icon={Send} label="تلگرام" value="@Peyman_ART" />
          </div>
          <div className="mt-5">
            <Link to="/studio/request" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-fg">
              ثبت درخواست نوبت از سایت
            </Link>
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-muted">آخرین به‌روزرسانی: نوامبر ۲۰۲۶</p>
      </div>
    </Shell>
  );
}

function AppCard({ title, titleEn, desc, href, color }: { title: string; titleEn: string; desc: string; href: string; color: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className={`bg-gradient-to-r ${color} px-4 py-3 text-white`}>
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs opacity-90" dir="ltr">{titleEn}</p>
      </div>
      <div className="p-4">
        <p className="text-sm leading-7 text-fg/80">{desc}</p>
        <a
          href={href}
          download
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
        >
          <Download className="size-4" />
          دانلود مستقیم
        </a>
      </div>
    </div>
  );
}

function GalleryCard({ label, href, external }: { label: string; href: string; external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group relative flex aspect-square items-end overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 p-3 text-white shadow-md transition hover:scale-[1.02]"
    >
      <span className="relative z-10 text-sm font-bold">{label}</span>
      <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/10" />
    </a>
  );
}

function ContactLink({ href, icon: Icon, label, value }: { href: string; icon: typeof Phone; label: string; value: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:border-primary/40">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="font-medium" dir="ltr">{value}</p>
      </div>
    </a>
  );
}
