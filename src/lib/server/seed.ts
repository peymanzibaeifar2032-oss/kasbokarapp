/**
 * Database seeding utilities
 * Ensures categories are always available
 */

import type { Database } from '@/lib/db';

export async function ensureCategories(db: Database) {
  try {
    const categories = await db.selectFrom('categories').select('id').execute();
    
    if (categories.length === 0) {
      console.log('[seed] Seeding categories...');
      
      const categoryData = [
        { id: 1, name: 'آرایش و زیبایی', slug: 'beauty', icon: 'scissors', sort_order: 10 },
        { id: 2, name: 'پزشکی و سلامت', slug: 'health', icon: 'heart-pulse', sort_order: 20 },
        { id: 3, name: 'فناوری و طراحی', slug: 'tech', icon: 'laptop', sort_order: 30 },
        { id: 4, name: 'خودرو و تعمیرات', slug: 'auto', icon: 'wrench', sort_order: 40 },
        { id: 5, name: 'فروشگاه و خرید', slug: 'shop', icon: 'shopping-bag', sort_order: 50 },
        { id: 6, name: 'خدمات خانه', slug: 'home', icon: 'house', sort_order: 60 },
        { id: 7, name: 'غذا و رستوران', slug: 'food', icon: 'utensils', sort_order: 70 },
        { id: 8, name: 'کافه و شیرینی', slug: 'cafe', icon: 'coffee', sort_order: 80 },
        { id: 9, name: 'آموزش', slug: 'education', icon: 'graduation-cap', sort_order: 90 },
        { id: 10, name: 'ورزش و تندرستی', slug: 'sport', icon: 'dumbbell', sort_order: 100 },
        { id: 11, name: 'املاک و ساختمان', slug: 'estate', icon: 'building-2', sort_order: 110 },
        { id: 12, name: 'حقوقی و مالی', slug: 'legal', icon: 'scale', sort_order: 120 },
      ];
      
      for (const cat of categoryData) {
        await db
          .insertInto('categories')
          .values(cat)
          .onConflict((oc) => oc.column('id').doNothing())
          .execute();
      }
      
      console.log('[seed] ✅ Categories seeded');
    }
  } catch (err) {
    console.error('[seed] Error ensuring categories:', err);
    // Don't throw - categories might be seeded differently
  }
}
