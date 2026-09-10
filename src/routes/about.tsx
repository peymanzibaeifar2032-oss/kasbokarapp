import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, MapPinned, MessageCircle, Store } from "lucide-react";
import { Shell } from "@/components/layout/shell";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <Shell>
      <p className="text-sm text-accent">محصولی برای کسب‌وکارهای ایران</p>
      <h1 className="mt-2 max-w-xl text-3xl font-semibold">پیدا شدن را ساده می‌کنیم.</h1>
      <p className="mt-4 max-w-2xl leading-8 text-muted">
        کسب‌وکار یک وب‌اپلیکیشن برای پیدا کردن خدمات نزدیک، دیدن اطلاعات معتبر، رزرو وقت و ارتباط مستقیم است.
        ورود با حساب ChatGPT لازم نیست. صاحب هر کسب‌وکار ابزار ثبت، نوبت و نمایش روی نقشه را دارد.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Feature icon={MapPinned} title="کشف روی نقشه" text="جست‌وجو با دسته، شهر و فاصله." />
        <Feature icon={CalendarDays} title="رزرو ساده" text="درخواست وقت و مدیریت وضعیت رزرو." />
        <Feature icon={MessageCircle} title="ارتباط مستقیم" text="تماس، واتساپ و اینستاگرام." />
        <Feature icon={BadgeCheck} title="بررسی مدیریت" text="تأیید کسب‌وکار پیش از نمایش عمومی." />
        <Feature icon={Store} title="ثبت رایگان" text="۷ روز نمایش رایگان پس از تأیید." />
      </div>
      <section className="mt-10 max-w-lg rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">سازنده محصول</p>
        <h2 className="mt-1 text-xl font-semibold">پیمان زیبائی‌فر</h2>
        <p className="mt-3 text-sm leading-7">
          برای ارتباط درباره محصول:
          <br />
          ۰۹۲۱۶۸۱۲۸۵۲
        </p>
      </section>
    </Shell>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Store; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <Icon className="size-5 text-accent" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}
