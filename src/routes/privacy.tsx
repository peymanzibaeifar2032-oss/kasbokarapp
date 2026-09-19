import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";

export const Route = createFileRoute("/privacy")({ component: PrivacyPolicy });

function PrivacyPolicy() {
  return (
    <Shell>
      <main className="mx-auto max-w-3xl" dir="rtl">
        <p className="text-sm text-accent">آخرین به‌روزرسانی: شهریور ۱۴۰۵</p>
        <h1 className="mt-2 text-3xl font-semibold">سیاست حفظ حریم خصوصی کسب‌وکار</h1>
        <div className="mt-6 space-y-6 leading-8 text-muted">
          <section>
            <h2 className="text-lg font-semibold text-foreground">اطلاعاتی که دریافت می‌کنیم</h2>
            <p>اطلاعات حساب مانند نام، ایمیل و تصویر حساب، اطلاعات تماس، درخواست‌های رزرو و فایل‌هایی که کاربر با اختیار خود ارسال می‌کند، برای ارائه خدمات دریافت می‌شوند.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">نحوه استفاده از اطلاعات</h2>
            <p>این اطلاعات فقط برای ورود امن، مدیریت حساب، نمایش و مدیریت کسب‌وکار، رسیدگی به درخواست‌ها و رزروها، پشتیبانی و جلوگیری از سوءاستفاده استفاده می‌شوند.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">ورود با Google</h2>
            <p>در صورت انتخاب ورود با Google، فقط اطلاعات پایه‌ای که Google با رضایت کاربر ارائه می‌کند دریافت می‌شود. گذرواژه حساب Google در اختیار کسب‌وکار قرار نمی‌گیرد.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">اشتراک‌گذاری و نگهداری</h2>
            <p>اطلاعات شخصی فروخته نمی‌شوند. دسترسی فقط در حد لازم برای ارائه خدمات یا رعایت الزام قانونی انجام می‌شود. اطلاعات با تدابیر متعارف امنیتی نگهداری می‌شوند.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">حقوق کاربر</h2>
            <p>کاربر می‌تواند درخواست اصلاح یا حذف اطلاعات و قطع اتصال حساب Google را از طریق راه ارتباطی اعلام‌شده در سایت ارسال کند.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">ارتباط</h2>
            <p>برای پرسش‌های مربوط به حریم خصوصی از ایمیل پشتیبانی ثبت‌شده در صفحه ورود Google یا بخش ارتباط سایت استفاده کنید.</p>
          </section>
        </div>
      </main>
    </Shell>
  );
}
