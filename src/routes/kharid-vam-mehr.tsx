import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Banknote, CheckCircle2, Clock3, MapPin, Phone, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { friendlyError } from "@/lib/save";

const PAGE_TITLE = "خرید وام و امتیاز وام مهر ایران | عرفان حق‌شنو";
const PAGE_DESCRIPTION = "خریدار مستقیم امتیاز وام بانک قرض‌الحسنه مهر ایران؛ ثبت رایگان درخواست فروش، بررسی سریع و تماس مستقیم عرفان حق‌شنو در اسلامشهر.";

export const Route = createFileRoute("/kharid-vam-mehr")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://kasbokarapp.com/kharid-vam-mehr" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://kasbokarapp.com/kharid-vam-mehr" }],
  }),
  component: MehrLoanPage,
});

type SubmitResult = { ok?: boolean; trackingCode?: string; error?: string };

function MehrLoanPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/mehr-loan-leads", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          scoreAmount: form.get("scoreAmount"),
          repaymentMonths: form.get("repaymentMonths") || null,
          city: form.get("city"),
          description: form.get("description"),
          website: form.get("website"),
        }),
      });
      const data = (await response.json()) as SubmitResult;
      if (!response.ok) throw new Error(data.error || "ثبت درخواست انجام نشد.");
      setResult(data);
      event.currentTarget.reset();
    } catch (error) {
      setResult({ error: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  }

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FinancialService",
        name: "خرید امتیاز وام مهر ایران عرفان حق‌شنو",
        url: "https://kasbokarapp.com/kharid-vam-mehr",
        telephone: ["+989129642304", "+989121237283"],
        address: {
          "@type": "PostalAddress",
          addressLocality: "اسلامشهر",
          streetAddress: "شهرک دادگستری، جنب شهرداری منطقه ۱",
          addressCountry: "IR",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          ["چطور امتیاز وام مهر ایران را بفروشم؟", "فرم را با نام و شماره موبایل ثبت کنید. عرفان حق‌شنو مشخصات را بررسی می‌کند و برای ادامه فرایند با شما تماس می‌گیرد."],
          ["ثبت درخواست هزینه دارد؟", "خیر. ثبت اولیه درخواست فروش امتیاز وام در این صفحه رایگان است."],
          ["بعد از ثبت فرم چه اتفاقی می‌افتد؟", "یک کد پیگیری دریافت می‌کنید. درخواست در وضعیت بررسی قرار می‌گیرد و پس از بررسی، تماس مستقیم انجام می‌شود."],
        ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
      },
    ],
  };

  return (
    <div dir="rtl" className="min-h-dvh bg-[#f7f8f5] text-[#102a2a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="border-b border-[#dfe7df] bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-sm font-bold text-[#315f58]">کسب‌وکار</Link>
          <a href="tel:09129642304" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#e6f3ed] px-4 text-sm font-bold text-[#176248]">
            <Phone className="size-4" /> تماس مستقیم
          </a>
        </div>
      </header>

import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { BadgeCheck, Banknote, CheckCircle2, Clock3, MapPin, Phone, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { friendlyError } from "@/lib/save";

const PAGE_TITLE = "خرید وام و امتیاز وام مهر ایران | عرفان حق‌شنو";
const PAGE_DESCRIPTION = "خریدار مستقیم امتیاز وام بانک قرض‌الحسنه مهر ایران؛ ثبت رایگان درخواست فروش، بررسی سریع و تماس مستقیم عرفان حق‌شنو در اسلامشهر.";

export const Route = createFileRoute("/kharid-vam-mehr")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://kasbokarapp.com/kharid-vam-mehr" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://kasbokarapp.com/kharid-vam-mehr" }],
  }),
  component: MehrLoanPage,
});

type SubmitResult = { ok?: boolean; trackingCode?: string; error?: string };

function MehrLoanPage() {
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  if (location.pathname === "/kharid-vam-mehr/panel") return <Outlet />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/mehr-loan-leads", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          scoreAmount: form.get("scoreAmount"),
          repaymentMonths: form.get("repaymentMonths") || null,
          city: form.get("city"),
          description: form.get("description"),
          website: form.get("website"),
        }),
      });
      const data = (await response.json()) as SubmitResult;
      if (!response.ok) throw new Error(data.error || "ثبت درخواست انجام نشد.");
      setResult(data);
      event.currentTarget.reset();
    } catch (error) {
      setResult({ error: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  }

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FinancialService",
        name: "خرید امتیاز وام مهر ایران عرفان حق‌شنو",
        url: "https://kasbokarapp.com/kharid-vam-mehr",
        telephone: ["+989129642304", "+989121237283"],
        address: {
          "@type": "PostalAddress",
          addressLocality: "اسلامشهر",
          streetAddress: "شهرک دادگستری، جنب شهرداری منطقه ۱",
          addressCountry: "IR",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          ["چطور امتیاز وام مهر ایران را بفروشم؟", "فرم را با نام و شماره موبایل ثبت کنید. عرفان حق‌شنو مشخصات را بررسی می‌کند و برای ادامه فرایند با شما تماس می‌گیرد."],
          ["ثبت درخواست هزینه دارد؟", "خیر. ثبت اولیه درخواست فروش امتیاز وام در این صفحه رایگان است."],
          ["بعد از ثبت فرم چه اتفاقی می‌افتد؟", "یک کد پیگیری دریافت می‌کنید. درخواست در وضعیت بررسی قرار می‌گیرد و پس از بررسی، تماس مستقیم انجام می‌شود."],
        ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
      },
    ],
  };

  return (
    <div dir="rtl" className="min-h-dvh bg-[#f7f8f5] text-[#102a2a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="border-b border-[#dfe7df] bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-sm font-bold text-[#315f58]">کسب‌وکار</Link>
          <a href="tel:09129642304" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#e6f3ed] px-4 text-sm font-bold text-[#176248]">
            <Phone className="size-4" /> تماس مستقیم
          </a>
        </div>
      </header>
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { BadgeCheck, Banknote, CheckCircle2, Clock3, MapPin, Phone, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { friendlyError } from "@/lib/save";

const PAGE_TITLE = "خرید وام و امتیاز وام مهر ایران | عرفان حق‌شنو";
const PAGE_DESCRIPTION = "خریدار مستقیم امتیاز وام بانک قرض‌الحسنه مهر ایران؛ ثبت رایگان درخواست فروش، بررسی سریع و تماس مستقیم عرفان حق‌شنو در اسلامشهر.";

export const Route = createFileRoute("/kharid-vam-mehr")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://kasbokarapp.com/kharid-vam-mehr" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://kasbokarapp.com/kharid-vam-mehr" }],
  }),
  component: MehrLoanPage,
});

type SubmitResult = { ok?: boolean; trackingCode?: string; error?: string };

function MehrLoanPage() {
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  if (location.pathname === "/kharid-vam-mehr/panel") return <Outlet />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setResult(null);
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/mehr-loan-leads", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          scoreAmount: form.get("scoreAmount"),
          repaymentMonths: form.get("repaymentMonths") || null,
          city: form.get("city"),
          description: form.get("description"),
          website: form.get("website"),
        }),
      });
      const data = (await response.json()) as SubmitResult;
      if (!response.ok) throw new Error(data.error || "ثبت درخواست انجام نشد.");
      setResult(data);
      formElement.reset();
    } catch (error) {
      setResult({ error: friendlyError(error) });
    } finally {
      setBusy(false);
    }
  }

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FinancialService",
        name: "خرید امتیاز وام مهر ایران عرفان حق‌شنو",
        url: "https://kasbokarapp.com/kharid-vam-mehr",
        telephone: ["+989129642304", "+989121237283"],
        address: {
          "@type": "PostalAddress",
          addressLocality: "اسلامشهر",
          streetAddress: "شهرک دادگستری، جنب شهرداری منطقه ۱",
          addressCountry: "IR",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          ["چطور امتیاز وام مهر ایران را بفروشم؟", "فرم را با نام و شماره موبایل ثبت کنید. عرفان حق‌شنو مشخصات را بررسی می‌کند و برای ادامه فرایند با شما تماس می‌گیرد."],
          ["ثبت درخواست هزینه دارد؟", "خیر. ثبت اولیه درخواست فروش امتیاز وام در این صفحه رایگان است."],
          ["بعد از ثبت فرم چه اتفاقی می‌افتد؟", "یک کد پیگیری دریافت می‌کنید. درخواست در وضعیت بررسی قرار می‌گیرد و پس از بررسی، تماس مستقیم انجام می‌شود."],
        ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
      },
    ],
  };

  return (
    <div dir="rtl" className="min-h-dvh bg-[#f7f8f5] text-[#102a2a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="border-b border-[#dfe7df] bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-sm font-bold text-[#315f58]">کسب‌وکار</Link>
          <a href="tel:09129642304" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#e6f3ed] px-4 text-sm font-bold text-[#176248]">
            <Phone className="size-4" /> تماس مستقیم
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[#dfe7df] bg-[#eef5ef]">
          <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-[#bad9c8]/50 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div className="self-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#b8d6c5] bg-white px-3 py-1.5 text-xs font-bold text-[#176248]">
                <BadgeCheck className="size-4" /> خریدار مستقیم امتیاز وام مهر ایران
              </div>
              <h1 className="mt-5 text-4xl font-black leading-[1.3] tracking-tight sm:text-5xl">
                خرید وام و امتیاز وام <span className="text-[#087a55]">مهر ایران</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#48605a] sm:text-lg">
                امتیاز وام بانک مهر ایران دارید؟ مشخصات و شماره تماس را ثبت کنید. عرفان حق‌شنو درخواست را بررسی می‌کند و برای خرید مستقیم با شما تماس می‌گیرد.
              </p>
              <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
                <Trust icon={<Clock3 />} title="بررسی سریع" text="پس از ثبت درخواست" />
                <Trust icon={<ShieldCheck />} title="اطلاعات محرمانه" text="شماره شما عمومی نیست" />
                <Trust icon={<Banknote />} title="خرید مستقیم" text="بدون نمایش عمومی آگهی" />
              </div>
            </div>

            <form onSubmit={submit} className="rounded-[2rem] border border-[#d6e2da] bg-white p-5 shadow-[0_22px_70px_rgba(26,76,59,.12)] sm:p-7">
              <p className="text-sm font-bold text-[#087a55]">ثبت درخواست فروش امتیاز وام</p>
              <h2 className="mt-1 text-2xl font-black">برای بررسی با شما تماس می‌گیریم</h2>
              <p className="mt-2 text-sm leading-6 text-[#61736e]">نام و شماره موبایل الزامی است. سایر موارد به بررسی سریع‌تر کمک می‌کند.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="نام و نام خانوادگی *"><Input name="fullName" required minLength={2} autoComplete="name" /></Field>
                <Field label="شماره موبایل *"><Input name="phone" required inputMode="tel" dir="ltr" placeholder="0912xxxxxxx" autoComplete="tel" /></Field>
                <Field label="مبلغ امتیاز وام"><Input name="scoreAmount" inputMode="numeric" placeholder="مثلاً ۳۰۰ میلیون تومان" /></Field>
                <Field label="مدت بازپرداخت"><NativeSelect name="repaymentMonths" defaultValue=""><option value="">انتخاب کنید</option><option value="12">۱۲ ماه</option><option value="18">۱۸ ماه</option><option value="24">۲۴ ماه</option><option value="36">۳۶ ماه</option><option value="48">۴۸ ماه</option><option value="60">۶۰ ماه</option></NativeSelect></Field>
                <div className="sm:col-span-2"><Field label="شهر"><Input name="city" placeholder="مثلاً اسلامشهر" autoComplete="address-level2" /></Field></div>
                <div className="sm:col-span-2"><Field label="توضیحات"><Textarea name="description" rows={3} placeholder="شرایط امتیاز یا زمان موردنظر برای فروش را بنویسید." /></Field></div>
                <input className="hidden" tabIndex={-1} autoComplete="off" name="website" aria-hidden="true" />
              </div>
              <Button type="submit" disabled={busy} className="mt-5 h-13 w-full rounded-xl bg-[#087a55] text-base text-white hover:bg-[#066745]">
                {busy ? "در حال ثبت…" : "ثبت درخواست و دریافت کد پیگیری"}
              </Button>
              {result?.trackingCode ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                  <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-5" /> درخواست شما ثبت شد.</p>
                  <p>کد پیگیری: <strong dir="ltr">{result.trackingCode}</strong></p>
                  <p>وضعیت: در حال بررسی</p>
                </div>
              ) : null}
              {result?.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{result.error}</p> : null}
              <p className="mt-4 text-center text-xs leading-5 text-[#71827d]">با ثبت فرم، اجازه تماس برای بررسی همین درخواست را می‌دهید.</p>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_.8fr]">
            <div>
              <p className="text-sm font-bold text-[#087a55]">فرایند ساده و روشن</p>
              <h2 className="mt-2 text-3xl font-black">فروش امتیاز وام مهر در سه مرحله</h2>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {["ثبت نام و شماره تماس", "بررسی مشخصات امتیاز", "تماس مستقیم و هماهنگی"].map((text, index) => (
                  <div key={text} className="rounded-2xl border border-[#dfe7df] bg-white p-5">
                    <span className="grid size-9 place-items-center rounded-full bg-[#087a55] font-bold text-white">{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                    <p className="mt-4 font-bold leading-7">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <aside className="rounded-[2rem] bg-[#123d35] p-6 text-white sm:p-8">
              <p className="text-sm text-white/65">مسئول خرید و بررسی</p>
              <h2 className="mt-1 text-2xl font-black">عرفان حق‌شنو</h2>
              <div className="mt-6 space-y-3 text-sm">
                <a className="flex items-center gap-3 rounded-xl bg-white/10 p-3" href="tel:09129642304"><Phone className="size-5 text-[#8fe0bb]" /><span dir="ltr">۰۹۱۲۹۶۴۲۳۰۴</span></a>
                <a className="flex items-center gap-3 rounded-xl bg-white/10 p-3" href="tel:09121237283"><Phone className="size-5 text-[#8fe0bb]" /><span dir="ltr">۰۹۱۲۱۲۳۷۲۸۳</span></a>
                <p className="flex items-start gap-3 rounded-xl bg-white/10 p-3 leading-7"><MapPin className="mt-1 size-5 shrink-0 text-[#8fe0bb]" />اسلامشهر، شهرک دادگستری، جنب شهرداری منطقه ۱</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-t border-[#dfe7df] bg-white">
          <div className="mx-auto max-w-4xl px-4 py-14">
            <h2 className="text-center text-3xl font-black">سؤال‌های متداول خرید امتیاز وام مهر ایران</h2>
            <div className="mt-8 divide-y divide-[#dfe7df] rounded-2xl border border-[#dfe7df] px-5">
              <Faq q="چطور امتیاز وام مهر ایران را بفروشم؟">فرم همین صفحه را با نام و شماره موبایل ثبت کنید. پس از بررسی، عرفان حق‌شنو برای ادامه فرایند با شما تماس می‌گیرد.</Faq>
              <Faq q="ثبت درخواست هزینه دارد؟">خیر. ثبت اولیه درخواست فروش امتیاز وام رایگان است.</Faq>
              <Faq q="آیا شماره تماس من در سایت نمایش داده می‌شود؟">خیر. شماره کامل و توضیحات فقط در پنل بررسی درخواست‌ها دیده می‌شود.</Faq>
              <Faq q="ثبت فرم به معنی خرید قطعی است؟">خیر. خرید پس از بررسی مشخصات امتیاز و توافق دو طرف انجام می‌شود.</Faq>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#0d2c27] px-4 py-7 text-center text-sm text-white/65">خرید امتیاز وام مهر ایران — عرفان حق‌شنو</footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-[#334d47]"><span className="mb-2 block">{label}</span>{children}</label>;
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-[#d2e2d7] bg-white/80 p-4 [&_svg]:size-5 [&_svg]:text-[#087a55]"><div className="flex items-center gap-2 font-bold">{icon}{title}</div><p className="mt-1 text-xs text-[#667b74]">{text}</p></div>;
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return <details className="group py-5"><summary className="flex list-none items-center justify-between gap-4 font-bold"><span>{q}</span><span className="text-xl text-[#087a55] group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-7 text-[#5b6e68]">{children}</p></details>;
}

      <main>
        <section className="relative overflow-hidden border-b border-[#dfe7df] bg-[#eef5ef]">
          <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-[#bad9c8]/50 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div className="self-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#b8d6c5] bg-white px-3 py-1.5 text-xs font-bold text-[#176248]">
                <BadgeCheck className="size-4" /> خریدار مستقیم امتیاز وام مهر ایران
              </div>
              <h1 className="mt-5 text-4xl font-black leading-[1.3] tracking-tight sm:text-5xl">
                خرید وام و امتیاز وام <span className="text-[#087a55]">مهر ایران</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#48605a] sm:text-lg">
                امتیاز وام بانک مهر ایران دارید؟ مشخصات و شماره تماس را ثبت کنید. عرفان حق‌شنو درخواست را بررسی می‌کند و برای خرید مستقیم با شما تماس می‌گیرد.
              </p>
              <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
                <Trust icon={<Clock3 />} title="بررسی سریع" text="پس از ثبت درخواست" />
                <Trust icon={<ShieldCheck />} title="اطلاعات محرمانه" text="شماره شما عمومی نیست" />
                <Trust icon={<Banknote />} title="خرید مستقیم" text="بدون نمایش عمومی آگهی" />
              </div>
            </div>

            <form onSubmit={submit} className="rounded-[2rem] border border-[#d6e2da] bg-white p-5 shadow-[0_22px_70px_rgba(26,76,59,.12)] sm:p-7">
              <p className="text-sm font-bold text-[#087a55]">ثبت درخواست فروش امتیاز وام</p>
              <h2 className="mt-1 text-2xl font-black">برای بررسی با شما تماس می‌گیریم</h2>
              <p className="mt-2 text-sm leading-6 text-[#61736e]">نام و شماره موبایل الزامی است. سایر موارد به بررسی سریع‌تر کمک می‌کند.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="نام و نام خانوادگی *"><Input name="fullName" required minLength={2} autoComplete="name" /></Field>
                <Field label="شماره موبایل *"><Input name="phone" required inputMode="tel" dir="ltr" placeholder="0912xxxxxxx" autoComplete="tel" /></Field>
                <Field label="مبلغ امتیاز وام"><Input name="scoreAmount" inputMode="numeric" placeholder="مثلاً ۳۰۰ میلیون تومان" /></Field>
                <Field label="مدت بازپرداخت"><NativeSelect name="repaymentMonths" defaultValue=""><option value="">انتخاب کنید</option><option value="12">۱۲ ماه</option><option value="18">۱۸ ماه</option><option value="24">۲۴ ماه</option><option value="36">۳۶ ماه</option><option value="48">۴۸ ماه</option><option value="60">۶۰ ماه</option></NativeSelect></Field>
                <div className="sm:col-span-2"><Field label="شهر"><Input name="city" placeholder="مثلاً اسلامشهر" autoComplete="address-level2" /></Field></div>
                <div className="sm:col-span-2"><Field label="توضیحات"><Textarea name="description" rows={3} placeholder="شرایط امتیاز یا زمان موردنظر برای فروش را بنویسید." /></Field></div>
                <input className="hidden" tabIndex={-1} autoComplete="off" name="website" aria-hidden="true" />
              </div>
              <Button type="submit" disabled={busy} className="mt-5 h-13 w-full rounded-xl bg-[#087a55] text-base text-white hover:bg-[#066745]">
                {busy ? "در حال ثبت…" : "ثبت درخواست و دریافت کد پیگیری"}
              </Button>
              {result?.trackingCode ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                  <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-5" /> درخواست شما ثبت شد.</p>
                  <p>کد پیگیری: <strong dir="ltr">{result.trackingCode}</strong></p>
                  <p>وضعیت: در حال بررسی</p>
                </div>
              ) : null}
              {result?.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{result.error}</p> : null}
              <p className="mt-4 text-center text-xs leading-5 text-[#71827d]">با ثبت فرم، اجازه تماس برای بررسی همین درخواست را می‌دهید.</p>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_.8fr]">
            <div>
              <p className="text-sm font-bold text-[#087a55]">فرایند ساده و روشن</p>
              <h2 className="mt-2 text-3xl font-black">فروش امتیاز وام مهر در سه مرحله</h2>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {["ثبت نام و شماره تماس", "بررسی مشخصات امتیاز", "تماس مستقیم و هماهنگی"].map((text, index) => (
                  <div key={text} className="rounded-2xl border border-[#dfe7df] bg-white p-5">
                    <span className="grid size-9 place-items-center rounded-full bg-[#087a55] font-bold text-white">{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                    <p className="mt-4 font-bold leading-7">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <aside className="rounded-[2rem] bg-[#123d35] p-6 text-white sm:p-8">
              <p className="text-sm text-white/65">مسئول خرید و بررسی</p>
              <h2 className="mt-1 text-2xl font-black">عرفان حق‌شنو</h2>
              <div className="mt-6 space-y-3 text-sm">
                <a className="flex items-center gap-3 rounded-xl bg-white/10 p-3" href="tel:09129642304"><Phone className="size-5 text-[#8fe0bb]" /><span dir="ltr">۰۹۱۲۹۶۴۲۳۰۴</span></a>
                <a className="flex items-center gap-3 rounded-xl bg-white/10 p-3" href="tel:09121237283"><Phone className="size-5 text-[#8fe0bb]" /><span dir="ltr">۰۹۱۲۱۲۳۷۲۸۳</span></a>
                <p className="flex items-start gap-3 rounded-xl bg-white/10 p-3 leading-7"><MapPin className="mt-1 size-5 shrink-0 text-[#8fe0bb]" />اسلامشهر، شهرک دادگستری، جنب شهرداری منطقه ۱</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-t border-[#dfe7df] bg-white">
          <div className="mx-auto max-w-4xl px-4 py-14">
            <h2 className="text-center text-3xl font-black">سؤال‌های متداول خرید امتیاز وام مهر ایران</h2>
            <div className="mt-8 divide-y divide-[#dfe7df] rounded-2xl border border-[#dfe7df] px-5">
              <Faq q="چطور امتیاز وام مهر ایران را بفروشم؟">فرم همین صفحه را با نام و شماره موبایل ثبت کنید. پس از بررسی، عرفان حق‌شنو برای ادامه فرایند با شما تماس می‌گیرد.</Faq>
              <Faq q="ثبت درخواست هزینه دارد؟">خیر. ثبت اولیه درخواست فروش امتیاز وام رایگان است.</Faq>
              <Faq q="آیا شماره تماس من در سایت نمایش داده می‌شود؟">خیر. شماره کامل و توضیحات فقط در پنل بررسی درخواست‌ها دیده می‌شود.</Faq>
              <Faq q="ثبت فرم به معنی خرید قطعی است؟">خیر. خرید پس از بررسی مشخصات امتیاز و توافق دو طرف انجام می‌شود.</Faq>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#0d2c27] px-4 py-7 text-center text-sm text-white/65">خرید امتیاز وام مهر ایران — عرفان حق‌شنو</footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-[#334d47]"><span className="mb-2 block">{label}</span>{children}</label>;
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-[#d2e2d7] bg-white/80 p-4 [&_svg]:size-5 [&_svg]:text-[#087a55]"><div className="flex items-center gap-2 font-bold">{icon}{title}</div><p className="mt-1 text-xs text-[#667b74]">{text}</p></div>;
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return <details className="group py-5"><summary className="flex list-none items-center justify-between gap-4 font-bold"><span>{q}</span><span className="text-xl text-[#087a55] group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-7 text-[#5b6e68]">{children}</p></details>;
}
      <main>
        <section className="relative overflow-hidden border-b border-[#dfe7df] bg-[#eef5ef]">
          <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-[#bad9c8]/50 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
            <div className="self-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#b8d6c5] bg-white px-3 py-1.5 text-xs font-bold text-[#176248]">
                <BadgeCheck className="size-4" /> خریدار مستقیم امتیاز وام مهر ایران
              </div>
              <h1 className="mt-5 text-4xl font-black leading-[1.3] tracking-tight sm:text-5xl">
                خرید وام و امتیاز وام <span className="text-[#087a55]">مهر ایران</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#48605a] sm:text-lg">
                امتیاز وام بانک مهر ایران دارید؟ مشخصات و شماره تماس را ثبت کنید. عرفان حق‌شنو درخواست را بررسی می‌کند و برای خرید مستقیم با شما تماس می‌گیرد.
              </p>
              <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
                <Trust icon={<Clock3 />} title="بررسی سریع" text="پس از ثبت درخواست" />
                <Trust icon={<ShieldCheck />} title="اطلاعات محرمانه" text="شماره شما عمومی نیست" />
                <Trust icon={<Banknote />} title="خرید مستقیم" text="بدون نمایش عمومی آگهی" />
              </div>
            </div>

            <form onSubmit={submit} className="rounded-[2rem] border border-[#d6e2da] bg-white p-5 shadow-[0_22px_70px_rgba(26,76,59,.12)] sm:p-7">
              <p className="text-sm font-bold text-[#087a55]">ثبت درخواست فروش امتیاز وام</p>
              <h2 className="mt-1 text-2xl font-black">برای بررسی با شما تماس می‌گیریم</h2>
              <p className="mt-2 text-sm leading-6 text-[#61736e]">نام و شماره موبایل الزامی است. سایر موارد به بررسی سریع‌تر کمک می‌کند.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="نام و نام خانوادگی *"><Input name="fullName" required minLength={2} autoComplete="name" /></Field>
                <Field label="شماره موبایل *"><Input name="phone" required inputMode="tel" dir="ltr" placeholder="0912xxxxxxx" autoComplete="tel" /></Field>
                <Field label="مبلغ امتیاز وام"><Input name="scoreAmount" inputMode="numeric" placeholder="مثلاً ۳۰۰ میلیون تومان" /></Field>
                <Field label="مدت بازپرداخت"><NativeSelect name="repaymentMonths" defaultValue=""><option value="">انتخاب کنید</option><option value="12">۱۲ ماه</option><option value="18">۱۸ ماه</option><option value="24">۲۴ ماه</option><option value="36">۳۶ ماه</option><option value="48">۴۸ ماه</option><option value="60">۶۰ ماه</option></NativeSelect></Field>
                <div className="sm:col-span-2"><Field label="شهر"><Input name="city" placeholder="مثلاً اسلامشهر" autoComplete="address-level2" /></Field></div>
                <div className="sm:col-span-2"><Field label="توضیحات"><Textarea name="description" rows={3} placeholder="شرایط امتیاز یا زمان موردنظر برای فروش را بنویسید." /></Field></div>
                <input className="hidden" tabIndex={-1} autoComplete="off" name="website" aria-hidden="true" />
              </div>
              <Button type="submit" disabled={busy} className="mt-5 h-13 w-full rounded-xl bg-[#087a55] text-base text-white hover:bg-[#066745]">
                {busy ? "در حال ثبت…" : "ثبت درخواست و دریافت کد پیگیری"}
              </Button>
              {result?.trackingCode ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                  <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-5" /> درخواست شما ثبت شد.</p>
                  <p>کد پیگیری: <strong dir="ltr">{result.trackingCode}</strong></p>
                  <p>وضعیت: در حال بررسی</p>
                </div>
              ) : null}
              {result?.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{result.error}</p> : null}
              <p className="mt-4 text-center text-xs leading-5 text-[#71827d]">با ثبت فرم، اجازه تماس برای بررسی همین درخواست را می‌دهید.</p>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_.8fr]">
            <div>
              <p className="text-sm font-bold text-[#087a55]">فرایند ساده و روشن</p>
              <h2 className="mt-2 text-3xl font-black">فروش امتیاز وام مهر در سه مرحله</h2>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {["ثبت نام و شماره تماس", "بررسی مشخصات امتیاز", "تماس مستقیم و هماهنگی"].map((text, index) => (
                  <div key={text} className="rounded-2xl border border-[#dfe7df] bg-white p-5">
                    <span className="grid size-9 place-items-center rounded-full bg-[#087a55] font-bold text-white">{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                    <p className="mt-4 font-bold leading-7">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <aside className="rounded-[2rem] bg-[#123d35] p-6 text-white sm:p-8">
              <p className="text-sm text-white/65">مسئول خرید و بررسی</p>
              <h2 className="mt-1 text-2xl font-black">عرفان حق‌شنو</h2>
              <div className="mt-6 space-y-3 text-sm">
                <a className="flex items-center gap-3 rounded-xl bg-white/10 p-3" href="tel:09129642304"><Phone className="size-5 text-[#8fe0bb]" /><span dir="ltr">۰۹۱۲۹۶۴۲۳۰۴</span></a>
                <a className="flex items-center gap-3 rounded-xl bg-white/10 p-3" href="tel:09121237283"><Phone className="size-5 text-[#8fe0bb]" /><span dir="ltr">۰۹۱۲۱۲۳۷۲۸۳</span></a>
                <p className="flex items-start gap-3 rounded-xl bg-white/10 p-3 leading-7"><MapPin className="mt-1 size-5 shrink-0 text-[#8fe0bb]" />اسلامشهر، شهرک دادگستری، جنب شهرداری منطقه ۱</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-t border-[#dfe7df] bg-white">
          <div className="mx-auto max-w-4xl px-4 py-14">
            <h2 className="text-center text-3xl font-black">سؤال‌های متداول خرید امتیاز وام مهر ایران</h2>
            <div className="mt-8 divide-y divide-[#dfe7df] rounded-2xl border border-[#dfe7df] px-5">
              <Faq q="چطور امتیاز وام مهر ایران را بفروشم؟">فرم همین صفحه را با نام و شماره موبایل ثبت کنید. پس از بررسی، عرفان حق‌شنو برای ادامه فرایند با شما تماس می‌گیرد.</Faq>
              <Faq q="ثبت درخواست هزینه دارد؟">خیر. ثبت اولیه درخواست فروش امتیاز وام رایگان است.</Faq>
              <Faq q="آیا شماره تماس من در سایت نمایش داده می‌شود؟">خیر. شماره کامل و توضیحات فقط در پنل بررسی درخواست‌ها دیده می‌شود.</Faq>
              <Faq q="ثبت فرم به معنی خرید قطعی است؟">خیر. خرید پس از بررسی مشخصات امتیاز و توافق دو طرف انجام می‌شود.</Faq>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#0d2c27] px-4 py-7 text-center text-sm text-white/65">خرید امتیاز وام مهر ایران — عرفان حق‌شنو</footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-[#334d47]"><span className="mb-2 block">{label}</span>{children}</label>;
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-[#d2e2d7] bg-white/80 p-4 [&_svg]:size-5 [&_svg]:text-[#087a55]"><div className="flex items-center gap-2 font-bold">{icon}{title}</div><p className="mt-1 text-xs text-[#667b74]">{text}</p></div>;
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return <details className="group py-5"><summary className="flex list-none items-center justify-between gap-4 font-bold"><span>{q}</span><span className="text-xl text-[#087a55] group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-7 text-[#5b6e68]">{children}</p></details>;
}
