-- One searchable Kermanshah sample per category.
-- Names, job titles and services match the category. Idempotent. Does not touch smoke/E2E rows.

insert into businesses (
  id, owner_id, name, job_title, phone, province, city, address,
  latitude, longitude, category_id, description, instagram, whatsapp, website,
  work_hours, slot_minutes, prices, approval_status, is_active,
  trial_started_at, trial_ends_at, subscription_ends_at,
  verification_level, ranking_fresh_at
) values
(
  'biz-ks-01-beauty', 'seed-owner', 'سالن آرایش گل‌رخ', 'آرایشگاه زنانه', '08337220101',
  'کرمانشاه', 'کرمانشاه', 'میدان آزادی، مجتمع نور',
  34.329, 47.079, 1,
  'آرایشگاه زنانه با نوبت اصلاح، رنگ و براشینگ.',
  null, '989183720101', null,
  '[{"day":"شنبه","open":"10:00","close":"20:00","closed":false},{"day":"یکشنبه","open":"10:00","close":"20:00","closed":false},{"day":"دوشنبه","open":"10:00","close":"20:00","closed":false},{"day":"سه‌شنبه","open":"10:00","close":"20:00","closed":false},{"day":"چهارشنبه","open":"10:00","close":"20:00","closed":false},{"day":"پنجشنبه","open":"10:00","close":"21:00","closed":false},{"day":"جمعه","open":"11:00","close":"18:00","closed":false}]'::jsonb,
  60,
  '[{"title":"اصلاح و براشینگ","price":850000},{"title":"رنگ مو","price":2500000}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-02-health', 'seed-owner', 'مطب دکتر رستمی', 'پزشک عمومی', '08337220102',
  'کرمانشاه', 'کرمانشاه', 'بلوار کسری، ساختمان پزشکان',
  34.331, 47.081, 2,
  'ویزیت پزشک عمومی با نوبت دقیق.',
  null, '989183720102', null,
  '[{"day":"شنبه","open":"09:00","close":"18:00","closed":false},{"day":"یکشنبه","open":"09:00","close":"18:00","closed":false},{"day":"دوشنبه","open":"09:00","close":"18:00","closed":false},{"day":"سه‌شنبه","open":"09:00","close":"18:00","closed":false},{"day":"چهارشنبه","open":"09:00","close":"18:00","closed":false},{"day":"پنجشنبه","open":"09:00","close":"14:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  20,
  '[{"title":"ویزیت پزشک","price":450000}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-03-tech', 'seed-owner', 'استودیو نرم‌افزار کارا', 'طراحی سایت', '08337220103',
  'کرمانشاه', 'کرمانشاه', 'پارک علم و فناوری',
  34.333, 47.083, 3,
  'طراحی سایت و نرم‌افزار برای کسب‌وکارهای محلی.',
  null, '989183720103', null,
  '[{"day":"شنبه","open":"09:00","close":"18:00","closed":false},{"day":"یکشنبه","open":"09:00","close":"18:00","closed":false},{"day":"دوشنبه","open":"09:00","close":"18:00","closed":false},{"day":"سه‌شنبه","open":"09:00","close":"18:00","closed":false},{"day":"چهارشنبه","open":"09:00","close":"18:00","closed":false},{"day":"پنجشنبه","open":"09:00","close":"14:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  60,
  '[{"title":"طراحی سایت","price":8000000}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-04-auto', 'seed-owner', 'مکانیک سپهر', 'مکانیک خودرو', '08337220104',
  'کرمانشاه', 'کرمانشاه', 'شهرک صنعتی، قطعه ۱۲',
  34.315, 47.055, 4,
  'تعمیر موتور، برق خودرو و سرویس دوره‌ای.',
  null, '989183720104', null,
  '[{"day":"شنبه","open":"08:00","close":"17:00","closed":false},{"day":"یکشنبه","open":"08:00","close":"17:00","closed":false},{"day":"دوشنبه","open":"08:00","close":"17:00","closed":false},{"day":"سه‌شنبه","open":"08:00","close":"17:00","closed":false},{"day":"چهارشنبه","open":"08:00","close":"17:00","closed":false},{"day":"پنجشنبه","open":"08:00","close":"13:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  60,
  '[{"title":"تعمیر خودرو","price":0},{"title":"برق خودرو","price":400000}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-05-shop', 'seed-owner', 'فروشگاه خانه‌نو', 'فروشگاه لوازم خانه', '08337220105',
  'کرمانشاه', 'کرمانشاه', 'خیابان مدرس، پاساژ مرکزی',
  34.322, 47.07, 5,
  'فروشگاه خرید لوازم خانه و آشپزخانه.',
  null, '989183720105', null,
  '[{"day":"شنبه","open":"09:30","close":"21:00","closed":false},{"day":"یکشنبه","open":"09:30","close":"21:00","closed":false},{"day":"دوشنبه","open":"09:30","close":"21:00","closed":false},{"day":"سه‌شنبه","open":"09:30","close":"21:00","closed":false},{"day":"چهارشنبه","open":"09:30","close":"21:00","closed":false},{"day":"پنجشنبه","open":"09:30","close":"22:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  30,
  '[{"title":"خرید کالا","price":0}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-06-home', 'seed-owner', 'نظافت پاک‌خانه', 'نظافت منزل', '08337220106',
  'کرمانشاه', 'کرمانشاه', 'شهرک تعاون',
  34.335, 47.09, 6,
  'خدمات نظافت خانه، راه‌پله و تاسیسات سبک.',
  null, '989183720106', null,
  '[{"day":"شنبه","open":"08:00","close":"18:00","closed":false},{"day":"یکشنبه","open":"08:00","close":"18:00","closed":false},{"day":"دوشنبه","open":"08:00","close":"18:00","closed":false},{"day":"سه‌شنبه","open":"08:00","close":"18:00","closed":false},{"day":"چهارشنبه","open":"08:00","close":"18:00","closed":false},{"day":"پنجشنبه","open":"08:00","close":"16:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  60,
  '[{"title":"نظافت منزل","price":1200000}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-07-food', 'seed-owner', 'رستوران چلوکباب نیاوران', 'غذا و کباب', '08337220107',
  'کرمانشاه', 'کرمانشاه', 'بلوار شهید بهشتی',
  34.325, 47.065, 7,
  'رستوران غذای ایرانی و کباب با رزرو میز.',
  null, '989183720107', null,
  '[{"day":"شنبه","open":"12:00","close":"23:00","closed":false},{"day":"یکشنبه","open":"12:00","close":"23:00","closed":false},{"day":"دوشنبه","open":"12:00","close":"23:00","closed":false},{"day":"سه‌شنبه","open":"12:00","close":"23:00","closed":false},{"day":"چهارشنبه","open":"12:00","close":"23:00","closed":false},{"day":"پنجشنبه","open":"12:00","close":"23:30","closed":false},{"day":"جمعه","open":"12:00","close":"23:30","closed":false}]'::jsonb,
  90,
  '[{"title":"چلوکباب","price":450000}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-08-cafe', 'seed-owner', 'کافه قهوه دان', 'کافی‌شاپ', '08337220108',
  'کرمانشاه', 'کرمانشاه', 'گذر فرهنگی، نبش ارشاد',
  34.32, 47.075, 8,
  'کافه و قهوه تخصصی برای قرار کاری.',
  null, '989183720108', null,
  '[{"day":"شنبه","open":"08:00","close":"22:00","closed":false},{"day":"یکشنبه","open":"08:00","close":"22:00","closed":false},{"day":"دوشنبه","open":"08:00","close":"22:00","closed":false},{"day":"سه‌شنبه","open":"08:00","close":"22:00","closed":false},{"day":"چهارشنبه","open":"08:00","close":"22:00","closed":false},{"day":"پنجشنبه","open":"08:00","close":"23:00","closed":false},{"day":"جمعه","open":"09:00","close":"23:00","closed":false}]'::jsonb,
  30,
  '[{"title":"قهوه اسپرسو","price":120000}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-09-edu', 'seed-owner', 'آموزشگاه زبان نور', 'آموزش زبان', '08337220109',
  'کرمانشاه', 'کرمانشاه', 'خیابان فردوسی',
  34.328, 47.072, 9,
  'کلاس آموزش زبان با نوبت مشاوره.',
  null, '989183720109', null,
  '[{"day":"شنبه","open":"09:00","close":"20:00","closed":false},{"day":"یکشنبه","open":"09:00","close":"20:00","closed":false},{"day":"دوشنبه","open":"09:00","close":"20:00","closed":false},{"day":"سه‌شنبه","open":"09:00","close":"20:00","closed":false},{"day":"چهارشنبه","open":"09:00","close":"20:00","closed":false},{"day":"پنجشنبه","open":"09:00","close":"18:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  45,
  '[{"title":"کلاس خصوصی","price":800000}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-10-sport', 'seed-owner', 'باشگاه تناسب یاران', 'ورزش و بدنسازی', '08337220110',
  'کرمانشاه', 'کرمانشاه', 'بلوار طاق‌بستان',
  34.34, 47.1, 10,
  'باشگاه ورزش و تناسب با جلسه آزمایشی.',
  null, '989183720110', null,
  '[{"day":"شنبه","open":"07:00","close":"22:00","closed":false},{"day":"یکشنبه","open":"07:00","close":"22:00","closed":false},{"day":"دوشنبه","open":"07:00","close":"22:00","closed":false},{"day":"سه‌شنبه","open":"07:00","close":"22:00","closed":false},{"day":"چهارشنبه","open":"07:00","close":"22:00","closed":false},{"day":"پنجشنبه","open":"07:00","close":"22:00","closed":false},{"day":"جمعه","open":"09:00","close":"14:00","closed":false}]'::jsonb,
  45,
  '[{"title":"جلسه تمرین","price":0}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-11-estate', 'seed-owner', 'املاک طاق‌بستان', 'مشاور املاک', '08337220111',
  'کرمانشاه', 'کرمانشاه', 'میدان جهاد',
  34.326, 47.068, 11,
  'مشاوره مسکن و بازدید ملک.',
  null, '989183720111', null,
  '[{"day":"شنبه","open":"09:00","close":"19:00","closed":false},{"day":"یکشنبه","open":"09:00","close":"19:00","closed":false},{"day":"دوشنبه","open":"09:00","close":"19:00","closed":false},{"day":"سه‌شنبه","open":"09:00","close":"19:00","closed":false},{"day":"چهارشنبه","open":"09:00","close":"19:00","closed":false},{"day":"پنجشنبه","open":"09:00","close":"19:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  30,
  '[{"title":"بازدید ملک","price":0}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
),
(
  'biz-ks-12-legal', 'seed-owner', 'دفتر وکالت دادگر', 'وکیل پایه یک', '08337220112',
  'کرمانشاه', 'کرمانشاه', 'خیابان کشاورز، ساختمان عدل',
  34.324, 47.071, 12,
  'وکالت و مشاوره حقوقی با نوبت.',
  null, '989183720112', null,
  '[{"day":"شنبه","open":"09:00","close":"17:00","closed":false},{"day":"یکشنبه","open":"09:00","close":"17:00","closed":false},{"day":"دوشنبه","open":"09:00","close":"17:00","closed":false},{"day":"سه‌شنبه","open":"09:00","close":"17:00","closed":false},{"day":"چهارشنبه","open":"09:00","close":"17:00","closed":false},{"day":"پنجشنبه","open":"09:00","close":"13:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  30,
  '[{"title":"مشاوره حقوقی","price":700000}]'::jsonb,
  'approved', true, now(), now() + interval '400 days', null, 'basic', now()
)
on conflict (id) do nothing;
