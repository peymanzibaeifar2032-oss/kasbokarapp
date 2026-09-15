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
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

select setval('categories_id_seq', greatest((select coalesce(max(id), 1) from categories), 12), true);
