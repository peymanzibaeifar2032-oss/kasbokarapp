#!/usr/bin/env python3
"""Insert the missing lessons in reading order and give each a Persian step image."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("bp", "/workspace/docs/tattoo-school/build_practice.py")
bp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bp)

MODULES = {
    "grp-base-body": "mod-tattoo-base",
    "grp-base-tools": "mod-tattoo-base",
    "grp-base-draw": "mod-tattoo-base",
    "grp-base-before": "mod-tattoo-base",
    "grp-base-first": "mod-tattoo-base",
    "grp-tech-hand": "mod-tattoo-techniques",
    "grp-mid-color": "mod-tattoo-mid",
    "grp-mid-repair": "mod-tattoo-mid",
    "grp-pro-work": "mod-tattoo-pro",
    "grp-pro-shop": "mod-tattoo-pro",
}

raw = Path("/workspace/docs/tattoo-school/missing.txt").read_text()
blocks = [b.strip() for b in raw.split("===") if b.strip()]
parts = ["""update tattoo_modules set description = 'مسیر، پوست، ابزار، طراحی روی کاغذ، آماده‌سازی و اولین کار.', updated_at = now() where id = 'mod-tattoo-base';
update tattoo_modules set description = 'دست، خط، پر کردن، سایه، و توقف وقتی پوست یا مشتری تمام شده.', updated_at = now() where id = 'mod-tattoo-techniques';
update tattoo_modules set description = 'رنگ، جای بدن، جلسه، خطا، خوب شدن و لیزر.', updated_at = now() where id = 'mod-tattoo-mid';
update tattoo_modules set description = 'آستین، پشت، کاور، حیوان، عارضه، عکس، پول و حد کار.', updated_at = now() where id = 'mod-tattoo-pro';
"""]

for index, block in enumerate(blocks):
    head, rest = block.split("\n", 1)
    lesson_id, group_id, order, title = head.split("|")
    body, steps_raw = rest.split("---steps---\n", 1)
    s1, s2, s3, done = steps_raw.strip().split("|")
    body = body.strip()
    if "$" in body or "---تمرین---" in body:
        raise SystemExit("bad body " + lesson_id)
    practice = "\n".join([
        "هدف",
        f"مهارت «{title}» را بدون نگاه به متن نشان بدهی. این تمرین مجوز سوزن روی مشتری نیست.",
        "",
        "مراحل",
        f"۱. {s1}",
        f"۲. {s2}",
        f"۳. {s3}",
        "",
        "معیار قبول",
        done + ".",
        "",
        "اگر گیر کردی",
        "فقط همان مرحله را آهسته‌تر تکرار کن.",
    ])
    content = body + "\n\n---تمرین---\n" + practice
    module_id = MODULES[group_id]
    tag = f"miss{index}"
    parts.append(f"""insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id)
values ('{lesson_id}', '{module_id}', '{title}', ${tag}${content}${tag}$, {order}, true, '{group_id}')
on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  module_id = excluded.module_id,
  group_id = excluded.group_id,
  "order" = excluded."order",
  is_published = true,
  updated_at = now();
""")
    image = bp.jpeg(bp.panel([s1, s2, s3], title))
    parts.append(f"""insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('img-{lesson_id}', '{lesson_id}', '/api/tattoo/image/img-{lesson_id}', ${tag}a${image}${tag}a$, '{title}.', 1)
on conflict (id) do update set image_data = excluded.image_data, caption = excluded.caption, lesson_id = excluded.lesson_id, "order" = 1;
""")
    parts.append(f"""insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('img-ex-{lesson_id}', '{lesson_id}', '/api/tattoo/image/img-ex-{lesson_id}', ${tag}b${image}${tag}b$, 'تمرین. مراحل {title}.', 100)
on conflict (id) do update set image_data = excluded.image_data, caption = excluded.caption, lesson_id = excluded.lesson_id, "order" = 100;
""")

parts.append("""
update tattoo_lesson_groups set "order" = 0 where id = 'grp-base-path';
update tattoo_lesson_groups set "order" = 1 where id = 'grp-base-body';
update tattoo_lesson_groups set "order" = 2 where id = 'grp-base-tools';
update tattoo_lesson_groups set "order" = 3 where id = 'grp-base-draw';
update tattoo_lesson_groups set "order" = 4 where id = 'grp-base-before';
update tattoo_lesson_groups set "order" = 5 where id = 'grp-base-first';

update tattoo_lessons set "order" = 1, updated_at = now() where id = 'lesson-tattoo-skin';
update tattoo_lessons set "order" = 2, updated_at = now() where id = 'lesson-tattoo-hygiene';
update tattoo_lessons set "order" = 1, updated_at = now() where id = 'lesson-ch-03';
update tattoo_lessons set "order" = 2, updated_at = now() where id = 'lesson-ch-04';
update tattoo_lessons set "order" = 4, updated_at = now() where id = 'lesson-ch-05';
update tattoo_lessons set "order" = 6, updated_at = now() where id = 'lesson-ch-06';
update tattoo_lessons set "order" = 4, updated_at = now() where id = 'lesson-path-03';
update tattoo_lessons set "order" = 7, updated_at = now() where id = 'lesson-path-04';
update tattoo_lessons set "order" = 8, updated_at = now() where id = 'lesson-path-05';
update tattoo_lessons set "order" = 3, updated_at = now() where id = 'lesson-ch-07';
update tattoo_lessons set "order" = 4, updated_at = now() where id = 'lesson-ch-08';
update tattoo_lessons set "order" = 5, updated_at = now() where id = 'lesson-path-06';
update tattoo_lessons set "order" = 6, updated_at = now() where id = 'lesson-path-07';
update tattoo_lessons set "order" = 1, updated_at = now() where id = 'lesson-ch-09';
update tattoo_lessons set "order" = 2, updated_at = now() where id = 'lesson-ch-10';
update tattoo_lessons set "order" = 3, updated_at = now() where id = 'lesson-path-08';
update tattoo_lessons set "order" = 1, updated_at = now() where id = 'lesson-ch-14';
update tattoo_lessons set "order" = 2, updated_at = now() where id = 'lesson-ch-15';
update tattoo_lessons set "order" = 6, updated_at = now() where id = 'lesson-ch-16';
update tattoo_lessons set "order" = 7, updated_at = now() where id = 'lesson-path-10';
update tattoo_lessons set "order" = 8, updated_at = now() where id = 'lesson-path-11';
update tattoo_lessons set "order" = 1, updated_at = now() where id = 'lesson-ch-17';
update tattoo_lessons set "order" = 2, updated_at = now() where id = 'lesson-ch-18';
update tattoo_lessons set "order" = 3, updated_at = now() where id = 'lesson-path-12';

update tattoo_lessons
set content = content || $mapadd$

به‌روزرسانی فهرست
طراحی روی کاغذ قبل از استنسیل است: خط و حجم، نور، ترکیب، گل و دست، نسبت سر، خوشنویسی، عکس مرجع.
ابزار بعد از سوزن کلی، خانوادهٔ RS و مگنوم و M1 را دارد و بعد ولتاژ. سوزن RL همان مجموعهٔ خود استاد است.
قبل از سوزن: اصلاح و سد، بعد دستکش و سطل تیز، بعد استنسیل و رضایت.
اولین کار: تقویم روز اول تا سی‌ام و اشتباه چسب شفاف.
کار عملی: دست و گردن، مفصل، ماندگاری رنگ‌ها، جای لیزر.
حرفه‌ای: آستین، بک‌پیس، فرق بلست‌اور و کاور، پرترهٔ حیوان، تاتوی یادبود.
$mapadd$, updated_at = now()
where id = 'lesson-path-01' and position('به‌روزرسانی فهرست' in content) = 0;
""")

path = Path("/workspace/migrations/0067_tattoo_missing.sql")
path.write_text("\n".join(parts))
print("lessons", len(blocks), "bytes", path.stat().st_size)
