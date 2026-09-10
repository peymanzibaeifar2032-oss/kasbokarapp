insert into categories (id, name, slug, icon, sort_order) values
  (1, 'آرایش و زیبایی', 'beauty', 'scissors', 10),
  (2, 'پزشکی و سلامت', 'health', 'heart-pulse', 20),
  (3, 'فناوری و طراحی', 'tech', 'laptop', 30),
  (4, 'خودرو و تعمیرات', 'auto', 'wrench', 40),
  (5, 'فروشگاه و خرید', 'shop', 'shopping-bag', 50),
  (6, 'خدمات خانه', 'home', 'house', 60),
  (7, 'غذا و رستوران', 'food', 'utensils', 70),
  (8, 'کافه و شیرینی', 'cafe', 'coffee', 80),
  (9, 'آموزش', 'education', 'graduation-cap', 90),
  (10, 'ورزش و تندرستی', 'sport', 'dumbbell', 100),
  (11, 'املاک و ساختمان', 'estate', 'building-2', 110),
  (12, 'حقوقی و مالی', 'legal', 'scale', 120)
on conflict (id) do nothing;

select setval('categories_id_seq', 12, true);

insert into businesses (
  id, owner_id, name, job_title, phone, province, city, address,
  latitude, longitude, category_id, description, instagram, whatsapp, website,
  work_hours, slot_minutes, prices, approval_status, is_active,
  trial_started_at, trial_ends_at, subscription_ends_at
) values
(
  'biz-maahrokh', 'seed-owner', 'سالن ماه‌رخ', 'آرایش و مراقبت مو', '02191001122',
  'تهران', 'تهران', 'خیابان ولیعصر، بالاتر از پارک ساعی',
  35.7362, 51.4109, 1,
  'خدمات مو، رنگ و براشینگ با نوبت آنلاین. مشاوره پیش از مراجعه رایگان است.',
  'maahrokh.beauty', '989121112233', null,
  '[{"day":"شنبه","open":"10:00","close":"20:00","closed":false},{"day":"یکشنبه","open":"10:00","close":"20:00","closed":false},{"day":"دوشنبه","open":"10:00","close":"20:00","closed":false},{"day":"سه‌شنبه","open":"10:00","close":"20:00","closed":false},{"day":"چهارشنبه","open":"10:00","close":"20:00","closed":false},{"day":"پنجشنبه","open":"10:00","close":"21:00","closed":false},{"day":"جمعه","open":"11:00","close":"18:00","closed":false}]'::jsonb,
  60,
  '[{"title":"اصلاح و براشینگ","price":850000},{"title":"رنگ و مش","price":2800000}]'::jsonb,
  'approved', true, now() - interval '20 days', now() - interval '13 days', now() + interval '120 days'
),
(
  'biz-nikpey', 'seed-owner', 'کلینیک نیک‌پی', 'پزشک عمومی', '02188770011',
  'تهران', 'تهران', 'میدان ونک، خیابان ملاصدرا',
  35.7576, 51.4091, 2,
  'ویزیت حضوری با نوبت دقیق، پرونده ساده و پیگیری بعد از مراجعه.',
  null, '982188770011', null,
  '[{"day":"شنبه","open":"09:00","close":"18:00","closed":false},{"day":"یکشنبه","open":"09:00","close":"18:00","closed":false},{"day":"دوشنبه","open":"09:00","close":"18:00","closed":false},{"day":"سه‌شنبه","open":"09:00","close":"18:00","closed":false},{"day":"چهارشنبه","open":"09:00","close":"18:00","closed":false},{"day":"پنجشنبه","open":"09:00","close":"14:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  20,
  '[{"title":"ویزیت عمومی","price":450000}]'::jsonb,
  'approved', true, now() - interval '10 days', now() - interval '3 days', now() + interval '60 days'
),
(
  'biz-codeara', 'seed-owner', 'استودیو کُدآرا', 'طراحی سایت و نرم‌افزار', '08337220011',
  'کرمانشاه', 'کرمانشاه', 'بلوار طاق‌بستان، مجتمع فناوری',
  34.3465, 47.0948, 3,
  'طراحی محصول دیجیتال، وب‌سایت و اپ برای کسب‌وکارهای غرب کشور.',
  'codeara.studio', '989183334455', null,
  '[{"day":"شنبه","open":"09:00","close":"18:00","closed":false},{"day":"یکشنبه","open":"09:00","close":"18:00","closed":false},{"day":"دوشنبه","open":"09:00","close":"18:00","closed":false},{"day":"سه‌شنبه","open":"09:00","close":"18:00","closed":false},{"day":"چهارشنبه","open":"09:00","close":"18:00","closed":false},{"day":"پنجشنبه","open":"09:00","close":"14:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  60,
  '[{"title":"جلسه مشاوره","price":0},{"title":"طراحی صفحه وب","price":6500000}]'::jsonb,
  'approved', true, now() - interval '5 days', now() + interval '2 days', null
),
(
  'biz-rahno', 'seed-owner', 'تعمیرگاه راه‌نو', 'مکانیک و برق خودرو', '08333770022',
  'کرمانشاه', 'کرمانشاه', 'شهرک کارگاهی، ورودی دوم',
  34.3121, 47.0412, 4,
  'سرویس دوره‌ای و برق خودرو با اعلام هزینه پیش از شروع کار.',
  null, '989185556677', null,
  '[{"day":"شنبه","open":"08:00","close":"17:00","closed":false},{"day":"یکشنبه","open":"08:00","close":"17:00","closed":false},{"day":"دوشنبه","open":"08:00","close":"17:00","closed":false},{"day":"سه‌شنبه","open":"08:00","close":"17:00","closed":false},{"day":"چهارشنبه","open":"08:00","close":"17:00","closed":false},{"day":"پنجشنبه","open":"08:00","close":"13:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  60,
  '[{"title":"بازدید اولیه","price":250000}]'::jsonb,
  'approved', true, now() - interval '1 day', now() + interval '6 days', null
),
(
  'biz-naghsh', 'seed-owner', 'آتلیه نقش', 'تاتو و طراحی بدن', '08337221100',
  'کرمانشاه', 'کرمانشاه', 'میدان مرکزی، مجتمع ارشاد',
  34.3215, 47.067, 1,
  'طراحی اختصاصی تاتو با بهداشت استریل و مشاوره طرح پیش از جلسه.',
  'atelier.naghsh', '989216812000', null,
  '[{"day":"شنبه","open":"11:00","close":"20:00","closed":false},{"day":"یکشنبه","open":"11:00","close":"20:00","closed":false},{"day":"دوشنبه","open":"11:00","close":"20:00","closed":false},{"day":"سه‌شنبه","open":"11:00","close":"20:00","closed":false},{"day":"چهارشنبه","open":"11:00","close":"20:00","closed":false},{"day":"پنجشنبه","open":"11:00","close":"21:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  90,
  '[{"title":"مشاوره طرح","price":0},{"title":"جلسه تاتو","price":3500000}]'::jsonb,
  'approved', true, now(), now() + interval '7 days', null
),
(
  'biz-noon', 'seed-owner', 'کافه نون و نمک', 'کافه و نان تازه', '08337224400',
  'کرمانشاه', 'کرمانشاه', 'میدان شهرداری، گذر پیاده',
  34.3189, 47.0734, 8,
  'قهوه تخصصی، نان روز و فضای آرام برای قرار کاری.',
  'noonnamak', '989183221100', null,
  '[{"day":"شنبه","open":"08:00","close":"22:00","closed":false},{"day":"یکشنبه","open":"08:00","close":"22:00","closed":false},{"day":"دوشنبه","open":"08:00","close":"22:00","closed":false},{"day":"سه‌شنبه","open":"08:00","close":"22:00","closed":false},{"day":"چهارشنبه","open":"08:00","close":"22:00","closed":false},{"day":"پنجشنبه","open":"08:00","close":"23:00","closed":false},{"day":"جمعه","open":"09:00","close":"23:00","closed":false}]'::jsonb,
  30,
  '[{"title":"میز دو نفره","price":0}]'::jsonb,
  'approved', true, now() - interval '2 days', now() + interval '5 days', null
),
(
  'biz-shiraz-bagh', 'seed-owner', 'باغ‌رستوران نارنج', 'غذای ایرانی', '07132330044',
  'فارس', 'شیراز', 'بلوار چمران، نزدیک باغ ارم',
  29.636, 52.525, 7,
  'خوراک‌های خانگی شیرازی در فضای باز. رزرو میز برای جمع‌های خانوادگی.',
  'narenj.bagh', '989173334400', null,
  '[{"day":"شنبه","open":"12:00","close":"23:00","closed":false},{"day":"یکشنبه","open":"12:00","close":"23:00","closed":false},{"day":"دوشنبه","open":"12:00","close":"23:00","closed":false},{"day":"سه‌شنبه","open":"12:00","close":"23:00","closed":false},{"day":"چهارشنبه","open":"12:00","close":"23:00","closed":false},{"day":"پنجشنبه","open":"12:00","close":"00:00","closed":false},{"day":"جمعه","open":"12:00","close":"00:00","closed":false}]'::jsonb,
  90,
  '[{"title":"میز چهار نفره","price":0}]'::jsonb,
  'approved', true, now() - interval '8 days', now() - interval '1 day', now() + interval '40 days'
),
(
  'biz-isfahan-chashm', 'seed-owner', 'عینک‌خانه نقش‌جهان', 'عینک طبی و آفتابی', '03132221100',
  'اصفهان', 'اصفهان', 'خیابان استاندارد، نزدیک سی‌وسه‌پل',
  32.634, 51.658, 5,
  'تجویز عدسی، فریم دست‌ساز و تنظیم رایگان.',
  null, '989133221100', null,
  '[{"day":"شنبه","open":"09:30","close":"21:00","closed":false},{"day":"یکشنبه","open":"09:30","close":"21:00","closed":false},{"day":"دوشنبه","open":"09:30","close":"21:00","closed":false},{"day":"سه‌شنبه","open":"09:30","close":"21:00","closed":false},{"day":"چهارشنبه","open":"09:30","close":"21:00","closed":false},{"day":"پنجشنبه","open":"09:30","close":"22:00","closed":false},{"day":"جمعه","open":"","close":"","closed":true}]'::jsonb,
  30,
  '[{"title":"معاینه و مشاوره","price":0}]'::jsonb,
  'approved', true, now() - interval '4 days', now() + interval '3 days', null
),
(
  'biz-mashhad-gym', 'seed-owner', 'باشگاه سپهر', 'بدنسازی و اصلاح حرکات', '05138550022',
  'خراسان رضوی', 'مشهد', 'بلوار سجاد، بین سجاد ۹ و ۱۱',
  36.318, 59.558, 10,
  'برنامه تمرینی شخصی و کلاس اصلاحی با مربی ثابت.',
  'sepehr.gym', '989151112200', null,
  '[{"day":"شنبه","open":"07:00","close":"22:00","closed":false},{"day":"یکشنبه","open":"07:00","close":"22:00","closed":false},{"day":"دوشنبه","open":"07:00","close":"22:00","closed":false},{"day":"سه‌شنبه","open":"07:00","close":"22:00","closed":false},{"day":"چهارشنبه","open":"07:00","close":"22:00","closed":false},{"day":"پنجشنبه","open":"07:00","close":"22:00","closed":false},{"day":"جمعه","open":"09:00","close":"14:00","closed":false}]'::jsonb,
  45,
  '[{"title":"جلسه آزمایشی","price":0},{"title":"ماهانه","price":2200000}]'::jsonb,
  'approved', true, now() - interval '15 days', now() - interval '8 days', now() + interval '90 days'
)
on conflict (id) do nothing;
