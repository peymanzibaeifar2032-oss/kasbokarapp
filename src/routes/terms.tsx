import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";

export const Route = createFileRoute("/terms")({ component: TermsOfService });

function TermsOfService() {
  return (
    <Shell>
      <main className="mx-auto max-w-3xl" dir="rtl">
        <p className="text-sm text-accent">آخرین به‌روزرسانی: شهریور ۱۴۰۵</p>
        <h1 className="mt-2 text-3xl font-semibold">شرایط استفاده از کسب‌وکار</h1>
        <div className="mt-6 space-y-6 leading-8 text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground">پذیرش شرایط</h2>
            <p>استفاده از این وب‌اپلیکیشن به معنی پذیرش این شرایط و سیاست حفظ حریم خصوصی است.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">حساب و اطلاعات کاربر</h2>
            <p>کاربر مسئول درستی اطلاعات ثبت‌شده و حفاظت از دسترسی حساب خود است. استفاده گمراه‌کننده، غیرقانونی یا آسیب‌زننده مجاز نیست.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">درخواست و رزرو</h2>
            <p>ارسال درخواست به‌تنهایی رزرو قطعی نیست. رزرو تنها پس از تأیید مراحل نمایش‌داده‌شده در سامانه نهایی می‌شود. قیمت، زمان، بیعانه و شرایط لغو باید پیش از پرداخت بررسی شوند.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">محتوای کاربران و کسب‌وکارها</h2>
            <p>مسئولیت قانونی و صحت تصاویر، توضیحات، خدمات، قیمت‌ها و سایر محتوای ثبت‌شده بر عهده ارسال‌کننده آن است.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">تغییرات</h2>
            <p>ممکن است برای بهبود خدمات یا رعایت الزامات قانونی این شرایط اصلاح شود. نسخه جاری همیشه در همین صفحه قرار می‌گیرد.</p>
          </section>
        </div>
      </main>
    </Shell>
  );
}
