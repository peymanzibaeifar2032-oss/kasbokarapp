import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tableOfContents } from "./index.ts";
import { withDepthSkinToc } from "./depth-skin.ts";
import { mergePanelLessons, type VisibleLessonRow } from "./panel-lessons.ts";
import { BATCH_SIZE, NEW_DAYS, buildClassIndex, fa, indexCatalog, indexModules, newLessonIds } from "./class-index.ts";

const DAY = 24 * 60 * 60 * 1000;

const book = withDepthSkinToc(tableOfContents());
const now = Date.parse("2026-11-13T12:00:00Z");
const seeded = new Date(now - 5 * DAY).toISOString();
const bookRows: VisibleLessonRow[] = book.flatMap((part) =>
  part.chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson, i) => ({
      id: lesson.id, title: lesson.title, order: i, moduleId: `cur-mod-${part.id}`, moduleTitle: part.title, moduleDescription: "", moduleOrder: 1,
      groupId: `cur-grp-${chapter.id}`, groupTitle: chapter.title, groupOrder: 1, createdAt: seeded,
    })),
  ),
);
const panel = (id: string, title: string, daysAgo: number): VisibleLessonRow => ({
  id, title, order: 50, moduleId: "cur-mod-p5", moduleTitle: "", moduleDescription: "", moduleOrder: 5, groupId: "cur-grp-c14", groupTitle: "", groupOrder: 14,
  createdAt: new Date(now - daysAgo * DAY).toISOString(),
});

describe("class index", () => {
  const rows = [...bookRows, panel("gw", "دانستنی‌های سبک گری واش", 2), panel("lm", "نحوهٔ اجرای یال شیر در تاتوی رئال", 1)];
  const index = buildClassIndex(mergePanelLessons(book, rows), rows, now);
  const lessons = index.parts.flatMap((part) => part.chapters.flatMap((chapter) => chapter.lessons));

  it("numbers every lesson once, 1..N in book order, panel lessons included", () => {
    assert.deepEqual(lessons.map((lesson) => lesson.seq), lessons.map((_, i) => i + 1));
    assert.equal(index.lessonCount, lessons.length);
    assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, lessons.length);
    assert.ok(lessons.find((lesson) => lesson.id === "gw")!.seq > 0);
  });

  it("counts chapters and lessons and marks only lessons added one by one as new", () => {
    assert.equal(index.chapterCount, index.parts.reduce((n, part) => n + part.chapters.length, 0));
    assert.deepEqual(lessons.filter((lesson) => lesson.isNew).map((lesson) => lesson.id), ["gw", "lm"]);
    assert.deepEqual(index.recent.map((item) => item.id), ["lm", "gw"], "newest first");
    const p5 = index.parts.find((part) => part.id === "p5")!;
    assert.equal(p5.newCount, 2);
    assert.equal(p5.chapters.find((chapter) => chapter.id === "c14")!.newCount, 2);
  });

  it("stops calling a lesson new after NEW_DAYS and ignores bulk imports", () => {
    assert.equal(newLessonIds([panel("old", "x", NEW_DAYS + 1)], now).size, 0);
    const batch = Array.from({ length: BATCH_SIZE }, (_, i) => ({ ...panel(`b${i}`, "x", 1), createdAt: seeded }));
    assert.equal(newLessonIds(batch, now).size, 0);
  });

  it("gives the installed app the full list in text it already shows", () => {
    const modules = indexModules(index, [{ id: "cur-mod-p5", title: "بخش ۵ — پیشرفته و حرفه‌ای", description: "", order: 5 }]);
    const p5 = modules.find((item) => item.id === "cur-mod-p5")!;
    assert.match(p5.description, /جدید: درس .+«دانستنی‌های سبک گری واش»/);
    assert.match(p5.description, /فصل ۱۴ — سبک‌ها \(۳ درس · ۲ درس جدید\)/);
    assert.doesNotMatch(p5.description, /[0-9]/, "Persian digits only");
    const catalog = indexCatalog(index, "cur-mod-p5", new Set(rows.map((row) => row.id)))!;
    const c14 = catalog.groups.find((group) => group.id === "cur-grp-c14")!;
    assert.match(c14.title, /۳ درس · ۲ درس جدید/);
    assert.ok(c14.lessons.at(-1)!.title.endsWith("نحوهٔ اجرای یال شیر در تاتوی رئال — جدید"));
    assert.ok(!indexCatalog(index, "cur-mod-p5", new Set(["gw"]))!.lessons.some((lesson) => lesson.id === "lm"), "hidden in the panel stays hidden");
    assert.equal(fa(42), "۴۲");
  });
});
