# کسب‌وکار — kasbokarapp.com

وب‌اپلیکیشن مستقل برای پیدا کردن کسب‌وکارهای محلی روی نقشه، رزرو نوبت، نظر، و پنل صاحب/مدیر.

مخزن GitHub **منبع حقیقت** است. اجرای عادی به Grok، این گفتگو، یا محیط پیش‌نمایش وابسته نیست.

شاخه اصلی: `main`

نسخهٔ آزمایشی فعلی روی Netlify (`https://kasbokarapp.netlify.app`) است و **Backup** می‌ماند. دامنهٔ `kasbokarapp.com` هنوز به آن وصل نشده و نباید بشود — کاربران داخل ایران بدون VPN به `*.netlify.app` دسترسی ندارند.

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
| `DATABASE_URL` | Postgres پایدار (Netlify/Neon یا Postgres روی VPS) |
| `BETTER_AUTH_SECRET` | امضای نشست |
| `BETTER_AUTH_URL` | `https://kasbokarapp.com` |
| `SITE_URL` | `https://kasbokarapp.com` |

اختیاری:

| متغیر | نقش |
|---|---|
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | ایمیل بازیابی رمز از VPS ایران (ترجیح) |
| `RESEND_API_KEY` | ایمیل ابری؛ از سرور داخل ایران ممکن است نرسد |
| `XAI_API_KEY` | مدل راهنما؛ بدون آن FAQ کار می‌کند |
| `MAP_TILE_URL` | قالب Leaflet XYZ ارائه‌دهندهٔ ایرانی یا self-hosted |
| `MAP_TILE_PROXY_UPSTREAM` | پروکسی هم‌مبدأ `/api/tiles/{z}/{x}/{y}` |

## Build / Run

محلی (پیش‌نمایش، پایگاه موقت):

```bash
npm ci
npm run dev
```

Production روی VPS با Docker:

```bash
cp .env.example .env
# فقط روی سرور مقداردهی شود — هیچ رازی در Git نیست
docker compose --profile with-db --profile tls up -d --build
```

اگر Postgres از قبل دارید (از جمله دیتابیس فعلی Netlify):

```bash
# DATABASE_URL را در .env بگذارید؛ سرویس db را بالا نیاورید
docker compose --profile tls up -d --build
```

مهاجرت اسکیما هنگام استارت کانتینر اجرا می‌شود. دستی: `npm run db:migrate`

## VPS پیشنهادی (هنوز نخریده‌اید — مهاجرت اجرا نمی‌شود)

کاربران اصلی داخل ایران‌اند. میزبان باید از داخل ایران بدون VPN باز شود.

| مورد | حداقل | پیشنهادی |
|---|---|---|
| موقعیت | ایران (تهران / اصفهان) | دیتاسنتر داخلی: ابرآروان، پارس‌پک، ایران‌سرور، آسیاتک |
| سیستم‌عامل | Ubuntu 24.04 LTS | همان |
| CPU | ۲ هسته | ۴ هسته اگر تایل نقشه self-hosted شود |
| RAM | ۴ گیگ | ۸ گیگ با تایل self-hosted |
| دیسک | ۴۰ گیگ SSD | ۸۰–۱۲۰ گیگ اگر extract ایران OSM را روی سرور می‌گذارید |
| شبکه | IPv4 عمومی + پورت ۸۰/۴۴۳ | فایروال فقط SSH از IP شما |
| نرم‌افزار | Docker Engine + Compose plugin | git |

چرا ایران: `*.netlify.app` و بسیاری CDNهای خارجی از داخل کشور فیلتر یا بسیار کندند. IP ایرانی برای خود سایت ضروری است. اگر تایل OSM.org را از سرور پروکسی کنید، دیتاسنتر ایران اغلب خودش هم به OSM.org نمی‌رسد — پس تایل باید ایرانی یا self-hosted باشد.

## نقشه (Provider-independent)

مختصات و جست‌وجوی کسب‌وکار **فقط در Postgres خودمان** است. Geocoding/Search خارجی نداریم.

وضعیت فعلی لایهٔ نمایش:

| لایه | الان | از ایران |
|---|---|---|
| کاشی پیش‌فرض | `tile.openstreetmap.org` | مسدود / کند (علت سفید شدن نقشه روی Netlify) |
| کاشی پشتیبان | ArcGIS World Street Map | معمولاً از ایران هم مشکل دارد |
| کتابخانه | Leaflet از npm (باندل خود برنامه) | وابستگی زمان اجرا به CDN ندارد |
| مسیریابی دکمه | اول نشان (`nshn.ir`)، بعد Google Maps | نشان در ایران کار می‌کند |
| موقعیت من | `navigator.geolocation` مرورگر | بدون سرور خارجی |

برای Production ایران یکی از این‌ها را در `.env` بگذارید — **بدون بازنویسی برنامه**:

1. **ارائه‌دهندهٔ ایرانی** (نشان / Map.ir): `MAP_TILE_URL=.../{z}/{x}/{y}.png` و در صورت نیاز کلید روی پروکسی
2. **پروکسی هم‌مبدأ**: `MAP_TILE_PROXY_UPSTREAM=...` تا مرورگر فقط به `kasbokarapp.com/api/tiles/...` حرف بزند
3. **Self-hosted** بعداً: TileServer GL + extract ایران؛ `MAP_TILE_URL=http://tiles:8080/styles/iran/{z}/{x}/{y}.png`

تایل رایگان عمومی OSM.org برای Production ایران استفاده نشود (خلاف پایداری و سیاست استفادهٔ OSM).

## وابستگی‌های خارجی که ممکن است در ایران قطع شوند

| سرویس | کجا | اگر قطع شود |
|---|---|---|
| Netlify + `*.netlify.app` | کل سایت آزمایشی | سایت باز نمی‌شود — به همین دلیل VPS ایران |
| OSM.org / ArcGIS tiles | کاشی نقشه اگر env خالی باشد | نقشه سفید؛ داده کسب‌وکار سر جایش است |
| `api.resend.com` | ایمیل بازیابی رمز | فرم هست؛ نامه نمی‌رود. SMTP روی VPS جایگزین است |
| `api.x.ai` | راهنمای هوشمند | FAQ داخلی ادامه می‌دهد |
| `api.telegram.org` | اطلاع باگ (اختیاری) | گزارش در دیتابیس می‌ماند |
| `auth.grok.me` | ورود گوگل پیش‌نمایش Grok | Production فقط ایمیل/رمز است؛ استفاده نمی‌شود |
| Google Maps لینک مسیر | دکمهٔ دوم مسیر | دکمهٔ نشان باقی است |

فونت وزیرمتن داخل باندل است. Leaflet از npm باندل می‌شود. هیچ CDN فرانت اجباری نیست.

## Deploy

GitHub `main` منبع حقیقت است.

- **Netlify:** نسخهٔ آزمایشی/Backup. DNS دامنه را به آن وصل نکنید.
- **VPS:** مهاجرت هنوز اجرا نمی‌شود. بعد از تهیه سرور:

  1. روی سرور Ubuntu 24.04: Docker Engine + افزونه Compose (۲.۲۴ به‌بعد، به‌خاطر `depends_on.required`) و git
  2. Deploy Key فقط‌خواندنی مخزن خصوصی را روی سرور بگذارید
  3. یک‌بار: `git clone` به `/opt/kasbokarapp`، کپی `.env.example` به `.env`، مقداردهی (حداقل `BETTER_AUTH_SECRET`، `POSTGRES_PASSWORD` یا `DATABASE_URL`، و `MAP_TILE_URL` یا `MAP_TILE_PROXY_UPSTREAM`)
  4. `COMPOSE_PROFILES=with-db,tls` در `.env` تا Postgres و HTTPS با Caddy بالا بیایند. اگر دیتابیس فعلی Netlify/Neon را نگه می‌دارید، `with-db` را نگذارید و فقط `DATABASE_URL` را پر کنید
  5. `docker compose up -d --build`
  6. در GitHub Secrets: `VPS_HOST`، `VPS_USER`، `VPS_SSH_KEY` (و اختیاری `VPS_APP_DIR`) تا workflow `deploy-vps` بعد از هر push به `main` روی سرور `git pull` و rebuild بزند

DNS `kasbokarapp.com` را فقط وقتی عوض کنید که VPS با HTTPS روی یک زیردامنهٔ تست پاسخ سالم داده باشد.

## Backup / Restore

```bash
DATABASE_URL=... npm run backup
DATABASE_URL=... node scripts/restore.mjs backups/YYYY-MM-DD --yes
```

روی VPS: `scripts/vps-backup.sh` را cron کنید (مثلاً ساعت ۲:۱۵ UTC). خروجی JSON است (هش رمز، نه متن رمز) و Commit نمی‌شود.

## امنیت

رمز عبور فقط به‌صورت hash ذخیره می‌شود. کوکی نشست `__Host-` و HTTPS است. نمایش نقشه و رزرو برای کسب‌وکار منقضی در سرور رد می‌شود. Health: `GET /api/health`.
