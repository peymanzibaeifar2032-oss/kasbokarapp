# کسب‌وکار — kasbokarapp.com

وب‌اپلیکیشن مستقل برای پیدا کردن کسب‌وکارهای محلی روی نقشه، رزرو نوبت، نظر، و پنل صاحب/مدیر.

مخزن GitHub **منبع حقیقت** است. اجرای عادی به Grok، این گفتگو، یا محیط پیش‌نمایش وابسته نیست.

شاخه اصلی: `main`

## امکانات

- نقشه و جست‌وجو (فقط کسب‌وکارهای تأییدشده با آزمایشی یا اشتراک فعال)
- ورود با ایمیل و رمز + بازیابی رمز
- ثبت کسب‌وکار، رزرو، نظر، پاسخ صاحب
- ۷ روز نمایش رایگان بعد از تأیید مدیر (فقط در سرور)
- دوره نمایشی ۳۰ روزه تا اتصال درگاه پرداخت
- راهنمای داخل برنامه (FAQ حتی اگر مدل هوش مصنوعی قطع باشد)
- علاقه‌مندی روی حساب واردشده

## متغیرهای محیطی Production

فایل `.env` را Commit نکنید. نمونه بدون راز: `.env.example`

حداقلی:

| متغیر | نقش |
|---|---|
| `STANDALONE=true` | اجرای مستقل؛ پایگاه موقت ممنوع |
| `DATABASE_URL` | Postgres پایدار |
| `BETTER_AUTH_SECRET` | امضای نشست |
| `BETTER_AUTH_URL` | `https://kasbokarapp.com` |
| `SITE_URL` | `https://kasbokarapp.com` |
| `RESEND_API_KEY` | ارسال ایمیل بازیابی رمز (اختیاری تا فعال‌سازی) |
| `XAI_API_KEY` | مدل راهنما (اختیاری؛ بدون آن FAQ کار می‌کند) |

## Build / Run

محلی (پیش‌نمایش، پایگاه موقت):

```bash
npm ci
npm run dev
```

Production با Docker (پایگاه داخل همان سرور، پایدار):

```bash
cp .env.example .env
# فقط روی سرور مقداردهی شود
docker compose up -d --build
```

مهاجرت اسکیما: `npm run db:migrate` (نیاز به `DATABASE_URL`)

## Deploy

Vercel اگر verification حساب باز بود: Import همین مخزن، شاخه `main`، متغیرهای جدول بالا.

اگر Vercel در دسترس نبود: **Render Blueprint** (`render.yaml`) یا Docker روی VPS پارس‌پک. هر دو HTTPS، متغیر محیطی، لاگ و سلامت `/api/health` دارند.

پس از بالا آمدن میزبان، DNS دامنه را طبق رکوردهای همان پنل تنظیم کنید (Apex معمولاً A یا ALIAS؛ `www` معمولاً CNAME). نسخهٔ اصلی: `https://kasbokarapp.com` و `www` به آن Redirect می‌شود.

## Backup / Restore

```bash
DATABASE_URL=... npm run backup
DATABASE_URL=... node scripts/restore.mjs backups/YYYY-MM-DD --yes
```

خروجی در `backups/` است و Commit نمی‌شود.

## امنیت

رمز عبور فقط به‌صورت hash ذخیره می‌شود. کوکی نشست `__Host-` و HTTPS است. نمایش نقشه و رزرو برای کسب‌وکار منقضی در سرور رد می‌شود.
