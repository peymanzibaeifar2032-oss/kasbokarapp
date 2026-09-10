create table if not exists reviews (
  id text primary key,
  business_id text not null references businesses (id) on delete cascade,
  user_id text not null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists reviews_biz_idx on reviews (business_id);

create table if not exists favorites (
  user_id text not null,
  business_id text not null references businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

alter table businesses add column if not exists offer_text text;
alter table bookings add column if not exists service_title text;
alter table bookings add column if not exists party_size int not null default 1;

update businesses set offer_text = '۲۰٪ تخفیف اولین رزرو' where id = 'biz-maahrokh' and offer_text is null;
update businesses set offer_text = 'جلسه آزمایشی رایگان' where id = 'biz-mashhad-gym' and offer_text is null;
update businesses set offer_text = 'قهوه دوم نیم‌بها تا ساعت ۱۶' where id = 'biz-noon' and offer_text is null;
update businesses set offer_text = 'بازدید اولیه رایگان' where id = 'biz-rahno' and offer_text is null;

insert into reviews (id, business_id, user_id, author_name, rating, body, created_at) values
  ('rev-1', 'biz-maahrokh', 'seed-u1', 'نگار احمدی', 5, 'نوبت سر وقت بود و نتیجه کار دقیق. برای رنگ مو حتماً دوباره می‌آیم.', now() - interval '12 days'),
  ('rev-2', 'biz-maahrokh', 'seed-u2', 'سارا محمدی', 4, 'محیط آرام و تمیز. فقط کمی معطلی برای پذیرش داشتم.', now() - interval '6 days'),
  ('rev-3', 'biz-nikpey', 'seed-u3', 'رضا کاظمی', 5, 'پزشک با حوصله توضیح داد و نوبت شلوغ نبود.', now() - interval '8 days'),
  ('rev-4', 'biz-nikpey', 'seed-u4', 'مینا رضایی', 4, 'ویزیت منظم است. پارکینگ اطراف کمی سخت پیدا می‌شود.', now() - interval '3 days'),
  ('rev-5', 'biz-codeara', 'seed-u5', 'حسین مرادی', 5, 'برای سایت فروشگاه مشورت خوبی دادند و زمان‌بندی شفاف بود.', now() - interval '9 days'),
  ('rev-6', 'biz-rahno', 'seed-u6', 'امیر حسینی', 5, 'قبل از شروع کار هزینه را گفتند. صداقت‌شان دلیل برگشتم شد.', now() - interval '4 days'),
  ('rev-7', 'biz-naghsh', 'seed-u7', 'الناز کریمی', 5, 'طرح اختصاصی کشیدند و بهداشت کار عالی بود.', now() - interval '11 days'),
  ('rev-8', 'biz-noon', 'seed-u8', 'پارسا نوری', 4, 'نان تازه و قهوه خوب. برای قرار کاری مناسب است.', now() - interval '2 days'),
  ('rev-9', 'biz-noon', 'seed-u1', 'نگار احمدی', 5, 'صبح‌ها خلوت‌تر است و میز کنار پنجره عالی است.', now() - interval '1 day'),
  ('rev-10', 'biz-shiraz-bagh', 'seed-u9', 'فاطمه زارعی', 5, 'غذای خانگی و فضای باز. برای جمع خانوادگی رزرو کنید.', now() - interval '7 days'),
  ('rev-11', 'biz-isfahan-chashm', 'seed-u2', 'سارا محمدی', 4, 'تنظیم فریم رایگان انجام شد. تنوع فریم خوب است.', now() - interval '5 days'),
  ('rev-12', 'biz-mashhad-gym', 'seed-u10', 'کیانوش عباسی', 5, 'مربی برنامه شخصی داد. جلسه آزمایشی واقعاً مفید بود.', now() - interval '10 days')
on conflict (id) do nothing;
