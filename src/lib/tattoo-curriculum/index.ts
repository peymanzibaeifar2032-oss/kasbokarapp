import { CHAPTERS, PARTS } from "./structure.ts";
import { GLOSSARY } from "./glossary.ts";
import { SOURCES } from "./sources.ts";
import { PUBLISHED_CHAPTERS } from "./publish.ts";
import { PART1 } from "./lessons/part1.ts";
import { PART2 } from "./lessons/part2.ts";
import { PART3 } from "./lessons/part3.ts";
import { PART4 } from "./lessons/part4.ts";
import { PART5 } from "./lessons/part5.ts";
import type { CurriculumLesson } from "./types.ts";

export { CHAPTERS, PARTS, GLOSSARY, SOURCES, PUBLISHED_CHAPTERS };
export type * from "./types.ts";

const chapterOrder = new Map(CHAPTERS.map((c) => [c.id, c.order]));

/** All 39 lessons in curriculum order. */
export const LESSONS: CurriculumLesson[] = [...PART1, ...PART2, ...PART3, ...PART4, ...PART5].sort(
  (a, b) => (chapterOrder.get(a.chapter) ?? 0) - (chapterOrder.get(b.chapter) ?? 0) || a.order - b.order,
);

export function isPublished(lesson: Pick<CurriculumLesson, "chapter">, published: readonly string[] = PUBLISHED_CHAPTERS) {
  return published.includes(lesson.chapter);
}

export function lessonNumber(id: string) {
  return LESSONS.findIndex((l) => l.id === id) + 1;
}

/** Old DB lesson ids already replaced by a live new lesson (these move to the archive list). */
export function replacedOldLessonIds(published: readonly string[] = PUBLISHED_CHAPTERS) {
  return LESSONS.filter((l) => isPublished(l, published)).flatMap((l) => l.replaces);
}

export type TocLesson = { id: string; number: number; title: string; level: string; published: boolean };
export type TocChapter = { id: string; title: string; lessons: TocLesson[] };
export type TocPart = { id: string; title: string; level: string; description: string; chapters: TocChapter[] };

export function tableOfContents(published: readonly string[] = PUBLISHED_CHAPTERS): TocPart[] {
  return PARTS.map((part) => ({
    id: part.id,
    title: part.title,
    level: part.level,
    description: part.description,
    chapters: CHAPTERS.filter((c) => c.part === part.id).map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      lessons: LESSONS.filter((l) => l.chapter === chapter.id).map((l) => ({
        id: l.id,
        number: lessonNumber(l.id),
        title: l.title,
        level: l.level,
        published: isPublished(l, published),
      })),
    })),
  }));
}

/** Lesson payload for the class page: sources and glossary resolved, related titles attached. */
export function lessonView(id: string, published: readonly string[] = PUBLISHED_CHAPTERS) {
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson || !isPublished(lesson, published)) return null;
  const chapter = CHAPTERS.find((c) => c.id === lesson.chapter);
  const part = PARTS.find((p) => p.id === lesson.part);
  return {
    ...lesson,
    number: lessonNumber(lesson.id),
    chapterTitle: chapter?.title ?? "",
    partTitle: part?.title ?? "",
    sources: lesson.sources.map((s) => SOURCES.find((x) => x.id === s)).filter((s) => !!s),
    glossary: lesson.glossary.map((g) => GLOSSARY.find((x) => x.id === g)).filter((g) => !!g),
    related: lesson.related.map((r) => {
      const other = LESSONS.find((l) => l.id === r);
      return { id: r, title: other?.title ?? r, number: lessonNumber(r), published: other ? isPublished(other, published) : false };
    }),
  };
}
export type LessonView = NonNullable<ReturnType<typeof lessonView>>;
