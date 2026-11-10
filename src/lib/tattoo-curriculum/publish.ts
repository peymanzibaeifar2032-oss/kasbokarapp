/**
 * Which chapters of the v2 curriculum are live on the site, in curriculum order.
 * Publishing = adding the next chapter id here (one PR per batch). Unpublishing = removing it.
 * Nothing in the database changes: the old lessons stay in tattoo_lessons untouched; the class page
 * only moves an old lesson into the "archive" once the new lesson that replaces it is live.
 */
export const PUBLISHED_CHAPTERS: readonly string[] = [];
