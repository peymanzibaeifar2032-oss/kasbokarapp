import type { TocLesson, TocPart } from "./index.ts";
import type { VisibleLessonRow } from "./panel-lessons.ts";

/**
 * One class index for every client (web /studio/class and the Android class app).
 *
 * The order comes from the book's table of contents with the studio/teach lessons already merged in
 * (mergePanelLessons). This file only numbers it, counts it and marks what is new, so the clients never
 * have to guess and a reorganised panel needs no new app build.
 */

/** A lesson stays «جدید» this many days after it was added in the panel. */
export const NEW_DAYS = 21;
/** Lessons inserted together (same transaction timestamp) are a bulk import of the book, not new lessons. */
export const BATCH_SIZE = 4;
const DAY = 24 * 60 * 60 * 1000;

export type IndexLesson = TocLesson & { seq: number; isNew: boolean };
export type IndexChapter = { id: string; title: string; lessons: IndexLesson[]; lessonCount: number; newCount: number };
export type IndexPart = {
  id: string;
  title: string;
  level: string;
  description: string;
  chapters: IndexChapter[];
  chapterCount: number;
  lessonCount: number;
  newCount: number;
};
export type RecentLesson = { id: string; seq: number; title: string; partTitle: string; chapterTitle: string; source?: "panel" };
export type ClassIndex = { parts: IndexPart[]; recent: RecentLesson[]; lessonCount: number; chapterCount: number; newDays: number };

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
/** 12 -> «۱۲» (no grouping), same on the server and in every client. */
export function fa(value: number | string) {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

function time(value: VisibleLessonRow["createdAt"]) {
  if (value === undefined || value === null) return NaN;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/** Ids of lessons added one by one (not in a bulk import) within the last NEW_DAYS days. */
export function newLessonIds(rows: VisibleLessonRow[], now = Date.now()): Map<string, number> {
  const batch = new Map<number, number>();
  for (const row of rows) {
    const t = time(row.createdAt);
    if (!Number.isNaN(t)) batch.set(t, (batch.get(t) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const row of rows) {
    const t = time(row.createdAt);
    if (Number.isNaN(t)) continue;
    if ((batch.get(t) ?? 0) >= BATCH_SIZE) continue;
    if (now - t > NEW_DAYS * DAY || t - now > DAY) continue;
    out.set(row.id, t);
  }
  return out;
}

/** Number every lesson 1..N in book order, count chapters and parts, mark new lessons and list them. */
export function buildClassIndex(parts: TocPart[], rows: VisibleLessonRow[], now = Date.now()): ClassIndex {
  const fresh = newLessonIds(rows, now);
  let seq = 0;
  const recent: (RecentLesson & { at: number })[] = [];
  const out: IndexPart[] = [];
  for (const part of parts) {
    const chapters: IndexChapter[] = [];
    for (const chapter of part.chapters) {
      if (!chapter.lessons.length) continue;
      const lessons = chapter.lessons.map((lesson) => {
        seq += 1;
        const isNew = lesson.published && fresh.has(lesson.id);
        if (isNew) {
          recent.push({ id: lesson.id, seq, title: lesson.title, partTitle: part.title, chapterTitle: chapter.title, at: fresh.get(lesson.id) ?? 0, ...(lesson.source ? { source: lesson.source } : {}) });
        }
        return { ...lesson, seq, isNew };
      });
      chapters.push({
        id: chapter.id,
        title: chapter.title,
        lessons,
        lessonCount: lessons.length,
        newCount: lessons.filter((lesson) => lesson.isNew).length,
      });
    }
    if (!chapters.length) continue;
    out.push({
      id: part.id,
      title: part.title,
      level: part.level,
      description: part.description,
      chapters,
      chapterCount: chapters.length,
      lessonCount: chapters.reduce((n, chapter) => n + chapter.lessonCount, 0),
      newCount: chapters.reduce((n, chapter) => n + chapter.newCount, 0),
    });
  }
  recent.sort((a, b) => b.at - a.at || a.seq - b.seq);
  return {
    parts: out,
    recent: recent.slice(0, 8).map(({ at: _at, ...item }) => item),
    lessonCount: seq,
    chapterCount: out.reduce((n, part) => n + part.chapterCount, 0),
    newDays: NEW_DAYS,
  };
}

/** The class-table module id a part of the index stands for. */
export function moduleIdOfPart(partId: string) {
  return partId.startsWith("panel-") ? partId.slice("panel-".length) : `cur-mod-${partId}`;
}

function partOfModule(index: ClassIndex, moduleId: string) {
  return index.parts.find((part) => moduleIdOfPart(part.id) === moduleId) ?? null;
}

function counts(lessons: number, newCount: number) {
  return `${fa(lessons)} درس${newCount ? ` · ${fa(newCount)} درس جدید` : ""}`;
}

/**
 * Text for a section card in the installed class app (1.5.0 and older), which only shows a module's title
 * and description: the full chapter list with every lesson title and number, new lessons first.
 */
export function moduleDescription(part: IndexPart) {
  const lines = [`${fa(part.chapterCount)} فصل · ${counts(part.lessonCount, part.newCount)}`];
  const fresh = part.chapters.flatMap((chapter) => chapter.lessons.filter((lesson) => lesson.isNew));
  if (fresh.length) lines.push(`جدید: ${fresh.map((lesson) => `درس ${fa(lesson.seq)} «${lesson.title}»`).join("، ")}`);
  if (part.description) lines.push(part.description);
  for (const chapter of part.chapters) {
    lines.push("", `${chapter.title} (${counts(chapter.lessonCount, chapter.newCount)})`);
    for (const lesson of chapter.lessons) lines.push(`${fa(lesson.seq)}. ${lesson.title}${lesson.isNew ? " — جدید" : ""}`);
  }
  return lines.join("\n");
}

type Module = { id: string; title: string; description: string; order: number };

/** /api/tattoo/modules in index order, one card per part that has lessons, with the full list as text. */
export function indexModules(index: ClassIndex, modules: Module[]): Module[] {
  return index.parts.map((part, at) => {
    const id = moduleIdOfPart(part.id);
    const known = modules.find((item) => item.id === id);
    return { id, title: known?.title || part.title, description: moduleDescription(part), order: at + 1 };
  });
}

type Card = { id: string; title: string; order: number; groupId?: string | null };
type Group = { id: string; title: string; order: number; lessons: Card[] };

/**
 * /api/tattoo/lessons/<module> for the installed app: chapters and lessons in index order, numbered titles,
 * counts and «جدید» in the text the app already shows. Lesson ids are unchanged, so opening a lesson works as before.
 */
export function indexCatalog(index: ClassIndex, moduleId: string, allowed?: Set<string>): { groups: Group[]; lessons: Card[] } | null {
  const part = partOfModule(index, moduleId);
  if (!part) return null;
  const groups = part.chapters.map((chapter, at) => {
    const groupId = chapter.id.startsWith("panel-") ? chapter.id.slice("panel-".length) : `cur-grp-${chapter.id}`;
    const lessons = chapter.lessons
      .filter((lesson) => lesson.published && (!allowed || allowed.has(lesson.id)))
      .map((lesson) => ({ id: lesson.id, title: `${fa(lesson.seq)}. ${lesson.title}${lesson.isNew ? " — جدید" : ""}`, order: lesson.seq, groupId }));
    return { id: groupId, title: `${chapter.title} · ${counts(lessons.length, chapter.newCount)}`, order: at + 1, lessons };
  }).filter((group) => group.lessons.length > 0);
  return { groups, lessons: groups.flatMap((group) => group.lessons) };
}
