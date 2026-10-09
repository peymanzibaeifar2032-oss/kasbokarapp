with defaults(name, slug, icon, sort_order) as (
  values
    ('آرایش و زیبایی', 'beauty', 'scissors', 10),
    ('پزشکی و سلامت', 'health', 'heart-pulse', 20),
    ('فناوری و طراحی', 'tech', 'laptop', 30),
    ('خودرو و تعمیرات', 'auto', 'wrench', 40),
    ('فروشگاه و خرید', 'shop', 'shopping-bag', 50),
    ('خدمات خانه', 'home', 'house', 60),
    ('غذا و رستوران', 'food', 'utensils', 70),
    ('کافه و شیرینی', 'cafe', 'coffee', 80),
    ('آموزش', 'education', 'graduation-cap', 90),
    ('ورزش و تندرستی', 'sport', 'dumbbell', 100),
    ('املاک و ساختمان', 'estate', 'building-2', 110),
    ('حقوقی و مالی', 'legal', 'scale', 120)
)
insert into categories (name, slug, icon, sort_order)
select name, slug, icon, sort_order
from defaults
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order;
