import type { TocChapter, TocLesson, TocPart } from "./index.ts";

/** One lesson an apprentice may see in the class tables (published, active module). */
export type VisibleLessonRow = {
  id: string;
  title: string;
  order: number;
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string;
  moduleOrder: number;
  groupId: string | null;
  groupTitle: string | null;
  groupOrder: number | null;
};

/** Same rule as the class app's /lessons and /lesson: published lesson in an active module. No lesson text. */
export const VISIBLE_LESSON_CARDS_SQL = `select l.id, l.title, l."order", l.module_id as "moduleId",
        m.title as "moduleTitle", m.description as "moduleDescription", m."order" as "moduleOrder",
        g.id as "groupId", g.title as "groupTitle", g."order" as "groupOrder"
   from tattoo_lessons l
   join tattoo_modules m on m.id = l.module_id
   left join tattoo_lesson_groups g on g.id = l.group_id and g.module_id = l.module_id
  where l.is_published = true and m.is_active = true
  order by m."order", m.created_at, g."order" nulls last, g.created_at, l."order", l.created_at`;

const BOOK_MODULE = "cur-mod-";
const BOOK_GROUP = "cur-grp-";

function copy(parts: TocPart[]): TocPart[] {
  return parts.map((part) => ({ ...part, chapters: part.chapters.map((chapter) => ({ ...chapter, lessons: [...chapter.lessons] })) }));
}

/**
 * Add lessons written in studio/teach (stored only in the class tables) to the book's table of contents.
 * A lesson goes into its own part and chapter when they are book ones (cur-mod-pN / cur-grp-cNN), right after
 * the lesson that comes before it in the teach panel's order. Lessons in a module or group the book does not
 * have get their own part or chapter at the end. Book lessons are never added twice, and rows must already be
 * limited to what an apprentice may see, so drafts and hidden lessons never reach this list.
 */
export function mergePanelLessons(parts: TocPart[], rows: VisibleLessonRow[]): TocPart[] {
  const out = copy(parts);
  const known = new Set(out.flatMap((part) => part.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id))));
  if (!rows.some((row) => !known.has(row.id))) return out;

  const buckets = new Map<string, VisibleLessonRow[]>();
  for (const row of rows) {
    const key = `${row.moduleId}\u0000${row.groupId ?? ""}`;
    const list = buckets.get(key);
    if (list) list.push(row);
    else buckets.set(key, [row]);
  }

  const placed = new Set<string>();
  for (const bucket of buckets.values()) {
    if (bucket.every((row) => known.has(row.id) || placed.has(row.id))) continue;
    const first = bucket[0];
    const part = partFor(out, first);
    const chapter = chapterFor(part, first);
    let anchor: string | null = null;
    for (const row of bucket) {
      if (known.has(row.id) || placed.has(row.id)) {
        if (chapter.lessons.some((lesson) => lesson.id === row.id)) anchor = row.id;
        continue;
      }
      const card: TocLesson = { id: row.id, number: 0, title: row.title, level: "", published: true, held: false, source: "panel" };
      const at = anchor ? chapter.lessons.findIndex((lesson) => lesson.id === anchor) + 1 : 0;
      chapter.lessons.splice(at, 0, card);
      placed.add(row.id);
      anchor = row.id;
    }
  }
  return out;
}

function partFor(parts: TocPart[], row: VisibleLessonRow): TocPart {
  if (row.moduleId.startsWith(BOOK_MODULE)) {
    const book = parts.find((part) => part.id === row.moduleId.slice(BOOK_MODULE.length));
    if (book) return book;
  }
  const id = `panel-${row.moduleId}`;
  const found = parts.find((part) => part.id === id);
  if (found) return found;
  const made: TocPart = { id, title: row.moduleTitle, level: "", description: row.moduleDescription || "", chapters: [] };
  parts.push(made);
  return made;
}

function chapterFor(part: TocPart, row: VisibleLessonRow): TocChapter {
  if (row.groupId?.startsWith(BOOK_GROUP)) {
    const book = part.chapters.find((chapter) => chapter.id === row.groupId!.slice(BOOK_GROUP.length));
    if (book) return book;
  }
  const id = row.groupId ? `panel-${row.groupId}` : `panel-loose-${row.moduleId}`;
  const found = part.chapters.find((chapter) => chapter.id === id);
  if (found) return found;
  const made: TocChapter = { id, title: row.groupTitle || "درس‌های تازه", lessons: [] };
  part.chapters.push(made);
  return made;
}

/** Ids of lessons in the merged list that open from the class tables rather than the book. */
export function panelLessonIds(parts: TocPart[]): string[] {
  return parts.flatMap((part) => part.chapters.flatMap((chapter) => chapter.lessons.filter((lesson) => lesson.source === "panel").map((lesson) => lesson.id)));
}
