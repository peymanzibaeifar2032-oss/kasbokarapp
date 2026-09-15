with seed (id, name, slug, icon, sort_order) as (
  values
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
)
update categories c
set
  name = s.name,
  slug = s.slug,
  icon = s.icon,
  sort_order = s.sort_order
from seed s
where c.id = s.id or c.slug = s.slug;

with seed (id, name, slug, icon, sort_order) as (
  values
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
)
insert into categories (id, name, slug, icon, sort_order)
select s.id, s.name, s.slug, s.icon, s.sort_order
from seed s
where not exists (
  select 1 from categories c where c.id = s.id or c.slug = s.slug
);

select setval('categories_id_seq', greatest((select coalesce(max(id), 1) from categories), 12), true);
