/**
 * Which chapters of the v2 curriculum are live on the site, in curriculum order.
 * Publishing = adding the next chapter id here (one PR per batch). Unpublishing = removing it.
 * Nothing in the database changes: the old lessons stay in tattoo_lessons untouched; the class page
 * only moves an old lesson into the "archive" once the new lesson that replaces it is live.
 */
export const PUBLISHED_CHAPTERS: readonly string[] = ["c01", "c02", "c03", "c04", "c05", "c06"];

/**
 * Lessons kept off the site even when their chapter is live, with the reason. Their old lessons stay
 * in the normal list until they are released.
 */
export const HELD_LESSONS: Readonly<Record<string, string>> = {
  "cur-29": "روش اجرای استودیو؛ منبع پژوهشی مستقل ندارد. منتظر بازبینی استاد.",
  "cur-32": "ترمیم و خواندن کار خوب‌شده؛ بیشتر تجربهٔ استودیو، منتظر بازبینی استاد.",
  "cur-34": "پروژهٔ بزرگ و جلسهٔ طولانی؛ فقط روش استودیو، منتظر بازبینی استاد.",
  "cur-35": "پرتره و یادبود؛ منبع پژوهشی کافی ندارد، منتظر بازبینی استاد.",
};
