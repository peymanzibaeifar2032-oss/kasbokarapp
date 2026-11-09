-- Reading order: beginner, technique, intermediate, styles, advanced practice.
-- Related lessons share one folder. A folder with a single lesson opens in one tap.

update tattoo_modules set title = '۱. مبتدی', description = 'اول این بخش. پوست، ابزار، آمادگی و اولین کار.', "order" = 10, updated_at = now() where id = 'mod-tattoo-base';
update tattoo_modules set title = '۲. تکنیک‌ها', description = 'بعد از مبتدی. دست، خط، رنگ و سایه.', "order" = 20, updated_at = now() where id = 'mod-tattoo-techniques';
update tattoo_modules set title = '۳. کار عملی', description = 'بعد از تکنیک. خط، رنگ، جا و ترمیم روی کار واقعی.', "order" = 30, updated_at = now() where id = 'mod-tattoo-mid';
update tattoo_modules set title = '۴. سبک‌ها', description = 'بعد از کار عملی. قانون تصویر هر سبک.', "order" = 40, updated_at = now() where id = 'mod-tattoo-styles';
update tattoo_modules set title = '۵. حرفه‌ای', description = 'آخر. اجرای سبک، عوارض، نگهداری و اخلاق.', "order" = 50, updated_at = now() where id = 'mod-tattoo-pro';

insert into tattoo_lesson_groups (id, module_id, title, "order") values
  ('grp-base-body', 'mod-tattoo-base', 'پوست و سلامت', 1),
  ('grp-base-tools', 'mod-tattoo-base', 'ابزار کار', 2),
  ('grp-base-before', 'mod-tattoo-base', 'قبل از سوزن', 3),
  ('grp-base-first', 'mod-tattoo-base', 'اولین کار', 4),
  ('grp-tech-index', 'mod-tattoo-techniques', 'فهرست تکنیک‌ها', 0),
  ('grp-tech-hand', 'mod-tattoo-techniques', 'دست و پوست', 1),
  ('grp-tech-line', 'mod-tattoo-techniques', 'خط', 2),
  ('grp-tech-fill', 'mod-tattoo-techniques', 'پر کردن و رنگ', 3),
  ('grp-tech-shade', 'mod-tattoo-techniques', 'سایه', 4),
  ('grp-tech-session', 'mod-tattoo-techniques', 'جلسهٔ واقعی', 5),
  ('grp-mid-line', 'mod-tattoo-mid', 'خط و سایه', 1),
  ('grp-mid-color', 'mod-tattoo-mid', 'رنگ، جا و جلسه', 2),
  ('grp-mid-repair', 'mod-tattoo-mid', 'خطا و ترمیم', 3),
  ('grp-style-index', 'mod-tattoo-styles', 'فهرست سبک‌ها', 0),
  ('grp-style-trad', 'mod-tattoo-styles', 'سنتی و خط قوی', 1),
  ('grp-style-black', 'mod-tattoo-styles', 'سیاه، نقش و هندسه', 2),
  ('grp-style-fine', 'mod-tattoo-styles', 'خط ظریف و نوشته', 3),
  ('grp-style-real', 'mod-tattoo-styles', 'رئال', 4),
  ('grp-style-draw', 'mod-tattoo-styles', 'تصویر آزاد', 5),
  ('grp-style-ritual', 'mod-tattoo-styles', 'ساک یانت', 6),
  ('grp-pro-work', 'mod-tattoo-pro', 'اجرای سبک', 1),
  ('grp-pro-shop', 'mod-tattoo-pro', 'عارضه، ابزار و اخلاق', 2)
on conflict (id) do update set
  module_id = excluded.module_id,
  title = excluded.title,
  "order" = excluded."order";

update tattoo_lessons set group_id = 'grp-base-body', "order" = 1, updated_at = now() where id = 'lesson-tattoo-skin';
update tattoo_lessons set group_id = 'grp-base-body', "order" = 2, updated_at = now() where id = 'lesson-tattoo-hygiene';
update tattoo_lessons set group_id = 'grp-base-tools', "order" = 1, updated_at = now() where id = 'lesson-ch-03';
update tattoo_lessons set group_id = 'grp-base-tools', "order" = 2, updated_at = now() where id = 'lesson-ch-04';
update tattoo_lessons set group_id = 'grp-base-tools', "order" = 3, updated_at = now() where id = 'lesson-ch-05';
update tattoo_lessons set group_id = 'grp-base-tools', "order" = 4, updated_at = now() where id = 'lesson-ch-06';
update tattoo_lessons set group_id = 'grp-base-before', "order" = 1, updated_at = now() where id = 'lesson-ch-07';
update tattoo_lessons set group_id = 'grp-base-before', "order" = 2, updated_at = now() where id = 'lesson-ch-08';
update tattoo_lessons set group_id = 'grp-base-first', "order" = 1, updated_at = now() where id = 'lesson-ch-09';
update tattoo_lessons set group_id = 'grp-base-first', "order" = 2, updated_at = now() where id = 'lesson-ch-10';

update tattoo_lessons set group_id = 'grp-tech-index', "order" = 1, updated_at = now() where id = 'lesson-tech-00';
update tattoo_lessons set group_id = 'grp-tech-hand', "order" = 1, updated_at = now() where id = 'lesson-tech-01';
update tattoo_lessons set group_id = 'grp-tech-hand', "order" = 2, updated_at = now() where id = 'lesson-tech-02';
update tattoo_lessons set group_id = 'grp-tech-hand', "order" = 3, updated_at = now() where id = 'lesson-tech-03';
update tattoo_lessons set group_id = 'grp-tech-hand', "order" = 4, updated_at = now() where id = 'lesson-tech-21';
update tattoo_lessons set group_id = 'grp-tech-hand', "order" = 5, updated_at = now() where id = 'lesson-tech-22';
update tattoo_lessons set group_id = 'grp-tech-line', "order" = 1, updated_at = now() where id = 'lesson-tech-04';
update tattoo_lessons set group_id = 'grp-tech-line', "order" = 2, updated_at = now() where id = 'lesson-tech-05';
update tattoo_lessons set group_id = 'grp-tech-line', "order" = 3, updated_at = now() where id = 'lesson-tech-06';
update tattoo_lessons set group_id = 'grp-tech-fill', "order" = 1, updated_at = now() where id = 'lesson-tech-07';
update tattoo_lessons set group_id = 'grp-tech-fill', "order" = 2, updated_at = now() where id = 'lesson-tech-08';
update tattoo_lessons set group_id = 'grp-tech-fill', "order" = 3, updated_at = now() where id = 'lesson-tech-09';
update tattoo_lessons set group_id = 'grp-tech-fill', "order" = 4, updated_at = now() where id = 'lesson-tech-17';
update tattoo_lessons set group_id = 'grp-tech-fill', "order" = 5, updated_at = now() where id = 'lesson-tech-18';
update tattoo_lessons set group_id = 'grp-tech-fill', "order" = 6, updated_at = now() where id = 'lesson-tech-19';
update tattoo_lessons set group_id = 'grp-tech-shade', "order" = 1, updated_at = now() where id = 'lesson-tech-10';
update tattoo_lessons set group_id = 'grp-tech-shade', "order" = 2, updated_at = now() where id = 'lesson-tech-11';
update tattoo_lessons set group_id = 'grp-tech-shade', "order" = 3, updated_at = now() where id = 'lesson-tech-12';
update tattoo_lessons set group_id = 'grp-tech-shade', "order" = 4, updated_at = now() where id = 'lesson-tech-13';
update tattoo_lessons set group_id = 'grp-tech-shade', "order" = 5, updated_at = now() where id = 'lesson-tech-14';
update tattoo_lessons set group_id = 'grp-tech-shade', "order" = 6, updated_at = now() where id = 'lesson-tech-15';
update tattoo_lessons set group_id = 'grp-tech-shade', "order" = 7, updated_at = now() where id = 'lesson-tech-16';
update tattoo_lessons set group_id = 'grp-tech-session', "order" = 1, updated_at = now() where id = 'lesson-tech-20';
update tattoo_lessons set group_id = 'grp-tech-session', "order" = 2, updated_at = now() where id = 'lesson-tech-23';
update tattoo_lessons set group_id = 'grp-tech-session', "order" = 3, updated_at = now() where id = 'lesson-tech-24';
update tattoo_lessons set group_id = 'grp-tech-session', "order" = 4, updated_at = now() where id = 'lesson-tech-25';
update tattoo_lessons set group_id = 'grp-tech-session', "order" = 5, updated_at = now() where id = 'lesson-tech-26';
update tattoo_lessons set group_id = 'grp-tech-session', "order" = 6, updated_at = now() where id = 'lesson-tech-27';

update tattoo_lessons set group_id = 'grp-mid-line', "order" = 1, updated_at = now() where id = 'lesson-ch-11';
update tattoo_lessons set group_id = 'grp-mid-line', "order" = 2, updated_at = now() where id = 'lesson-ch-12';
update tattoo_lessons set group_id = 'grp-mid-line', "order" = 3, updated_at = now() where id = 'lesson-ch-13';
update tattoo_lessons set group_id = 'grp-mid-color', "order" = 1, updated_at = now() where id = 'lesson-ch-14';
update tattoo_lessons set group_id = 'grp-mid-color', "order" = 2, updated_at = now() where id = 'lesson-ch-15';
update tattoo_lessons set group_id = 'grp-mid-color', "order" = 3, updated_at = now() where id = 'lesson-ch-16';
update tattoo_lessons set group_id = 'grp-mid-repair', "order" = 1, updated_at = now() where id = 'lesson-ch-17';
update tattoo_lessons set group_id = 'grp-mid-repair', "order" = 2, updated_at = now() where id = 'lesson-ch-18';

update tattoo_lessons set group_id = 'grp-style-index', "order" = 1, updated_at = now() where id = 'lesson-style-00';
update tattoo_lessons set group_id = 'grp-style-trad', "order" = 1, updated_at = now() where id = 'lesson-style-01';
update tattoo_lessons set group_id = 'grp-style-trad', "order" = 2, updated_at = now() where id = 'lesson-style-02';
update tattoo_lessons set group_id = 'grp-style-trad', "order" = 3, updated_at = now() where id = 'lesson-style-03';
update tattoo_lessons set group_id = 'grp-style-trad', "order" = 4, updated_at = now() where id = 'lesson-style-21';
update tattoo_lessons set group_id = 'grp-style-black', "order" = 1, updated_at = now() where id = 'lesson-style-04';
update tattoo_lessons set group_id = 'grp-style-black', "order" = 2, updated_at = now() where id = 'lesson-style-05';
update tattoo_lessons set group_id = 'grp-style-black', "order" = 3, updated_at = now() where id = 'lesson-style-06';
update tattoo_lessons set group_id = 'grp-style-black', "order" = 4, updated_at = now() where id = 'lesson-style-07';
update tattoo_lessons set group_id = 'grp-style-black', "order" = 5, updated_at = now() where id = 'lesson-style-08';
update tattoo_lessons set group_id = 'grp-style-black', "order" = 6, updated_at = now() where id = 'lesson-style-10';
update tattoo_lessons set group_id = 'grp-style-black', "order" = 7, updated_at = now() where id = 'lesson-style-09';
update tattoo_lessons set group_id = 'grp-style-fine', "order" = 1, updated_at = now() where id = 'lesson-style-11';
update tattoo_lessons set group_id = 'grp-style-fine', "order" = 2, updated_at = now() where id = 'lesson-style-12';
update tattoo_lessons set group_id = 'grp-style-fine', "order" = 3, updated_at = now() where id = 'lesson-style-26';
update tattoo_lessons set group_id = 'grp-style-fine', "order" = 4, updated_at = now() where id = 'lesson-style-27';
update tattoo_lessons set group_id = 'grp-style-fine', "order" = 5, updated_at = now() where id = 'lesson-style-28';
update tattoo_lessons set group_id = 'grp-style-real', "order" = 1, updated_at = now() where id = 'lesson-style-13';
update tattoo_lessons set group_id = 'grp-style-real', "order" = 2, updated_at = now() where id = 'lesson-style-14';
update tattoo_lessons set group_id = 'grp-style-real', "order" = 3, updated_at = now() where id = 'lesson-style-15';
update tattoo_lessons set group_id = 'grp-style-real', "order" = 4, updated_at = now() where id = 'lesson-style-16';
update tattoo_lessons set group_id = 'grp-style-real', "order" = 5, updated_at = now() where id = 'lesson-style-22';
update tattoo_lessons set group_id = 'grp-style-real', "order" = 6, updated_at = now() where id = 'lesson-style-23';
update tattoo_lessons set group_id = 'grp-style-draw', "order" = 1, updated_at = now() where id = 'lesson-style-17';
update tattoo_lessons set group_id = 'grp-style-draw', "order" = 2, updated_at = now() where id = 'lesson-style-18';
update tattoo_lessons set group_id = 'grp-style-draw', "order" = 3, updated_at = now() where id = 'lesson-style-19';
update tattoo_lessons set group_id = 'grp-style-draw', "order" = 4, updated_at = now() where id = 'lesson-style-20';
update tattoo_lessons set group_id = 'grp-style-draw', "order" = 5, updated_at = now() where id = 'lesson-style-24';
update tattoo_lessons set group_id = 'grp-style-draw', "order" = 6, updated_at = now() where id = 'lesson-style-25';
update tattoo_lessons set group_id = 'grp-style-draw', "order" = 7, updated_at = now() where id = 'lesson-style-30';
update tattoo_lessons set group_id = 'grp-style-draw', "order" = 8, updated_at = now() where id = 'lesson-style-31';
update tattoo_lessons set group_id = 'grp-style-ritual', "order" = 1, updated_at = now() where id = 'lesson-style-29';

update tattoo_lessons set group_id = 'grp-pro-work', "order" = 1, updated_at = now() where id = 'lesson-ch-19';
update tattoo_lessons set group_id = 'grp-pro-work', "order" = 2, updated_at = now() where id = 'lesson-ch-20';
update tattoo_lessons set group_id = 'grp-pro-work', "order" = 3, updated_at = now() where id = 'lesson-ch-21';
update tattoo_lessons set group_id = 'grp-pro-work', "order" = 4, updated_at = now() where id = 'lesson-ch-22';
update tattoo_lessons set group_id = 'grp-pro-work', "order" = 5, updated_at = now() where id = 'lesson-ch-23';
update tattoo_lessons set group_id = 'grp-pro-shop', "order" = 1, updated_at = now() where id = 'lesson-ch-24';
update tattoo_lessons set group_id = 'grp-pro-shop', "order" = 2, updated_at = now() where id = 'lesson-ch-25';
update tattoo_lessons set group_id = 'grp-pro-shop', "order" = 3, updated_at = now() where id = 'lesson-ch-26';

delete from tattoo_lesson_groups g
where g.module_id in ('mod-tattoo-base', 'mod-tattoo-mid', 'mod-tattoo-pro', 'mod-tattoo-styles', 'mod-tattoo-techniques')
  and not exists (select 1 from tattoo_lessons l where l.group_id = g.id);
