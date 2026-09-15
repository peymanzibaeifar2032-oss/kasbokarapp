-- Fix categories and ensure proper seeding
TRUNCATE TABLE categories CASCADE;

INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
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
ON CONFLICT (id) DO NOTHING;

SELECT setval('categories_id_seq', 12, true);

-- Verify categories inserted
VERIFY (SELECT COUNT(*) FROM categories) > 0;
