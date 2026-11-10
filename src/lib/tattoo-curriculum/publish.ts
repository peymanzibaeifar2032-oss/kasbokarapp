/**
 * Which chapters of the v2 curriculum are live on the site, in curriculum order.
 * These fifteen chapters are the new lessons built for the class. The old database
 * lessons are not in this list and are not shown on /studio/class.
 * Publishing = adding the next chapter id here. Unpublishing = removing it.
 */
export const PUBLISHED_CHAPTERS: readonly string[] = [
  "c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c10", "c11", "c12", "c13", "c14", "c15",
];

/**
 * Lessons kept off the site even when their chapter is live, with the reason.
 */
export const HELD_LESSONS: Readonly<Record<string, string>> = {};
