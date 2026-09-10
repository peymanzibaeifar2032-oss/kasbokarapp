import { createFileRoute, Link } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/download")({ component: Download });

function Download() {
  return (
    <Shell>
      <p className="text-sm text-accent">نسخه وب قابل نصب</p>
      <h1 className="mt-2 text-3xl font-semibold">کسب‌وکار را مثل یک اپ نصب کنید.</h1>
      <p className="mt-3 max-w-xl text-muted">
        فایل جدا و فروشگاه لازم نیست. همین صفحه را روی گوشی باز کنید و به صفحه اصلی اضافه کنید.
      </p>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        <Step n="۱" title="اندروید" text="در Chrome منوی سه‌نقطه را بزنید و Install app یا افزودن به صفحه اصلی را انتخاب کنید." />
        <Step n="۲" title="آیفون" text="در Safari دکمه Share را بزنید و Add to Home Screen را انتخاب کنید." />
        <Step n="۳" title="رایانه" text="در Chrome یا Edge، آیکون نصب کنار نوار نشانی را بزنید." />
      </ol>
      <Button asChild className="mt-8">
        <Link to="/">
          <Smartphone className="size-4" />
          باز کردن نسخه کامل
        </Link>
      </Button>
    </Shell>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <span className="text-sm text-muted">{n}</span>
      <h2 className="mt-1 font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
    </li>
  );
}
