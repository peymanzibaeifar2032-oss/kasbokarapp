import type { Sql } from "@/lib/db";

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
};

const DEFAULT_CATEGORIES = [
  { name: "آرایش و زیبایی", slug: "beauty", icon: "scissors", sort_order: 10 },
  { name: "پزشکی و سلامت", slug: "health", icon: "heart-pulse", sort_order: 20 },
  { name: "فناوری و طراحی", slug: "tech", icon: "laptop", sort_order: 30 },
  { name: "خودرو و تعمیرات", slug: "auto", icon: "wrench", sort_order: 40 },
  { name: "فروشگاه و خرید", slug: "shop", icon: "shopping-bag", sort_order: 50 },
  { name: "خدمات خانه", slug: "home", icon: "house", sort_order: 60 },
  { name: "غذا و رستوران", slug: "food", icon: "utensils", sort_order: 70 },
  { name: "کافه و شیرینی", slug: "cafe", icon: "coffee", sort_order: 80 },
  { name: "آموزش", slug: "education", icon: "graduation-cap", sort_order: 90 },
  { name: "ورزش و تندرستی", slug: "sport", icon: "dumbbell", sort_order: 100 },
  { name: "املاک و ساختمان", slug: "estate", icon: "building-2", sort_order: 110 },
  { name: "حقوقی و مالی", slug: "legal", icon: "scale", sort_order: 120 },
] as const;

const CATEGORY_SELECT = "select id, name, slug, icon, sort_order from categories order by sort_order, id";
const CATEGORY_UPSERT = `with defaults(name, slug, icon, sort_order) as (
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
  sort_order = excluded.sort_order`;

export async function ensureCategories(sql: Sql): Promise<CategoryRow[]> {
  const rows = await sql.query<CategoryRow>(CATEGORY_SELECT);
  const bySlug = new Map(rows.map((r) => [r.slug, r] as const));
  const ok = DEFAULT_CATEGORIES.every((c) => {
    const row = bySlug.get(c.slug);
    return row && row.name === c.name && row.icon === c.icon && Number(row.sort_order) === c.sort_order;
  });
  if (ok) return rows;
  await sql.query(CATEGORY_UPSERT);
  return sql.query<CategoryRow>(CATEGORY_SELECT);
}
