import { CHAPTERS, PARTS } from "./structure.ts";
import { GLOSSARY } from "./glossary.ts";
import { SOURCES } from "./sources.ts";
import { HELD_LESSONS, PUBLISHED_CHAPTERS } from "./publish.ts";
import { GLOSSARY_READING, READINGS, READING_FOR_LESSON } from "./readings.ts";
import { PART1 } from "./lessons/part1.ts";
import { PART2 } from "./lessons/part2.ts";
import { PART3 } from "./lessons/part3.ts";
import { PART4 } from "./lessons/part4.ts";
import { PART5 } from "./lessons/part5.ts";
import type { CurriculumLesson, ImageSlot } from "./types.ts";
import { EXTRA_IMAGES, SLOT_OVERRIDES } from "./images-meta.generated.ts";

export { CHAPTERS, PARTS, GLOSSARY, SOURCES, PUBLISHED_CHAPTERS, HELD_LESSONS, READINGS, READING_FOR_LESSON, GLOSSARY_READING };
export type * from "./types.ts";

const chapterOrder = new Map(CHAPTERS.map((c) => [c.id, c.order]));

/** Slot images with the images agent's alt/caption, plus its extra images (a second part right after its slot, others at the end). */
function withImages(lesson: CurriculumLesson): CurriculumLesson {
  const images: ImageSlot[] = lesson.images.map((i) => ({ ...i, ...(SLOT_OVERRIDES[i.id] ?? {}) }));
  for (const extra of EXTRA_IMAGES[lesson.id] ?? []) {
    const at = extra.after ? images.findIndex((i) => i.id === extra.after) : -1;
    if (at >= 0) images.splice(at + 1, 0, extra.image);
    else images.push(extra.image);
  }
  return { ...lesson, images };
}

/** All 39 lessons in curriculum order. */
export const LESSONS: CurriculumLesson[] = [...PART1, ...PART2, ...PART3, ...PART4, ...PART5]
  .map(withImages)
  .sort((a, b) => (chapterOrder.get(a.chapter) ?? 0) - (chapterOrder.get(b.chapter) ?? 0) || a.order - b.order);

export function isPublished(
  lesson: Pick<CurriculumLesson, "chapter" | "id">,
  published: readonly string[] = PUBLISHED_CHAPTERS,
  held: Readonly<Record<string, string>> = HELD_LESSONS,
) {
  return published.includes(lesson.chapter) && !(lesson.id in held);
}

/** A reading is served only when at least one live lesson points to it. */
export function readingIsLive(name: string, published: readonly string[] = PUBLISHED_CHAPTERS) {
  if (name === GLOSSARY_READING) return LESSONS.some((l) => isPublished(l, published));
  return LESSONS.some((l) => (READING_FOR_LESSON[l.id] ?? []).includes(name) && isPublished(l, published));
}

export function lessonNumber(id: string) {
  return LESSONS.findIndex((l) => l.id === id) + 1;
}

/** Old DB lesson ids already replaced by a live new lesson (these move to the archive list). */
export function replacedOldLessonIds(published: readonly string[] = PUBLISHED_CHAPTERS) {
  return LESSONS.filter((l) => isPublished(l, published)).flatMap((l) => l.replaces);
}

export type TocLesson = { id: string; number: number; title: string; level: string; published: boolean; held: boolean };
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
        held: published.includes(l.chapter) && l.id in HELD_LESSONS,
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
    readings: (READING_FOR_LESSON[lesson.id] ?? []).map((id) => ({ id, title: READINGS[id] })),
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
