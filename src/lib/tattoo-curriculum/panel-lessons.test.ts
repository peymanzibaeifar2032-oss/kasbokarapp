import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { tableOfContents, type TocPart } from "./index.ts";
import { withDepthSkinToc } from "./depth-skin.ts";
import { VISIBLE_LESSON_CARDS_SQL, mergePanelLessons, panelLessonIds, type VisibleLessonRow } from "./panel-lessons.ts";

const MIGRATIONS = new URL("../../../migrations/", import.meta.url);

/** The class tables as production has them: every tattoo-class migration, in order. */
async function classDb() {
  const db = new PGlite();
  const files = readdirSync(MIGRATIONS)
    .filter((name) => /^\d{4}_.*\.sql$/.test(name) && Number(name.slice(0, 4)) >= 56)
    .filter((name) => /tattoo|curriculum|needle|readable/.test(name))
    .sort();
  for (const name of files) await db.exec(readFileSync(new URL(name, MIGRATIONS), "utf8"));
  return db;
}

/** Same insert the teach panel's «درس» tab runs (save-lesson). */
async function teachLesson(db: PGlite, id: string, moduleId: string, groupId: string | null, title: string, order: number, isPublished: boolean) {
  await db.query(
    `insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7, now())`,
    [id, moduleId, title, `متن کامل ${title}`, order, isPublished, groupId],
  );
}

function ids(parts: TocPart[]) {
  return parts.flatMap((part) => part.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id)));
}

function chapter(parts: TocPart[], partId: string, chapterId: string) {
  const found = parts.find((part) => part.id === partId)?.chapters.find((item) => item.id === chapterId);
  assert.ok(found, `${partId}/${chapterId}`);
  return found;
}

describe("lessons written in studio/teach show in the class list", () => {
  const book = withDepthSkinToc(tableOfContents());

  it("changes nothing when the tables only hold book lessons", () => {
    const rows: VisibleLessonRow[] = ids(book).map((id, index) => ({ id, title: id, order: index, moduleId: "cur-mod-p1", moduleTitle: "", moduleDescription: "", moduleOrder: 1, groupId: "cur-grp-c01", groupTitle: "", groupOrder: 1 }));
    assert.deepEqual(mergePanelLessons(book, rows), book);
    assert.deepEqual(panelLessonIds(mergePanelLessons(book, [])), []);
  });

  it("puts each panel lesson right after the lesson before it in the panel order", () => {
    const base = { moduleId: "cur-mod-p5", moduleTitle: "بخش ۵", moduleDescription: "", moduleOrder: 5, groupId: "cur-grp-c14", groupTitle: "فصل ۱۴ — سبک‌ها", groupOrder: 14 };
    const c14 = chapter(book, "p5", "c14").lessons.map((lesson) => lesson.id);
    const rows: VisibleLessonRow[] = [
      { ...base, id: "first-new", title: "اول", order: 0 },
      { ...base, id: c14[0], title: "book", order: 1 },
      { ...base, id: "after-first-book", title: "وسط", order: 2 },
      ...c14.slice(1).map((id, index) => ({ ...base, id, title: "book", order: 3 + index })),
      { ...base, id: "at-end", title: "آخر", order: 99 },
    ];
    const merged = chapter(mergePanelLessons(book, rows), "p5", "c14").lessons.map((lesson) => lesson.id);
    assert.deepEqual(merged, ["first-new", c14[0], "after-first-book", ...c14.slice(1), "at-end"]);
  });

  it("gives a module or group the book does not have its own part or chapter", () => {
    const rows: VisibleLessonRow[] = [
      { id: "n1", title: "درس ماژول تازه", order: 0, moduleId: "m-new", moduleTitle: "ماژول تازه", moduleDescription: "توضیح", moduleOrder: 6, groupId: null, groupTitle: null, groupOrder: null },
      { id: "n2", title: "درس مجموعهٔ تازه", order: 9, moduleId: "cur-mod-p5", moduleTitle: "بخش ۵", moduleDescription: "", moduleOrder: 5, groupId: "g-new", groupTitle: "مجموعهٔ تازه", groupOrder: 3 },
    ];
    const merged = mergePanelLessons(book, rows);
    const part = merged.find((item) => item.id === "panel-m-new");
    assert.equal(part?.title, "ماژول تازه");
    assert.deepEqual(part?.chapters[0].lessons.map((lesson) => lesson.id), ["n1"]);
    assert.equal(chapter(merged, "p5", "panel-g-new").title, "مجموعهٔ تازه");
    assert.deepEqual(panelLessonIds(merged).sort(), ["n1", "n2"]);
  });

  it("reads the real class tables: visible teach lessons appear once, drafts and switched-off modules stay hidden", async () => {
    const db = await classDb();
    const before = (await db.query<VisibleLessonRow>(VISIBLE_LESSON_CARDS_SQL)).rows;
    assert.deepEqual(panelLessonIds(mergePanelLessons(book, before)), [], "seeded book lessons are not repeated");

    await teachLesson(db, "11111111-0000-4000-8000-000000000001", "cur-mod-p5", "cur-grp-c14", "دانستنی‌های سبک گری واش", 9, true);
    await teachLesson(db, "11111111-0000-4000-8000-000000000002", "cur-mod-p5", "cur-grp-c14", "نحوهٔ اجرای یال شیر در تاتوی رئال", 10, true);
    await teachLesson(db, "11111111-0000-4000-8000-000000000003", "cur-mod-p5", "cur-grp-c14", "پیش‌نویس", 11, false);
    await db.query(`insert into tattoo_modules (id, title, description, "order", is_active) values ('off-mod', 'خاموش', '', 9, false)`);
    await teachLesson(db, "11111111-0000-4000-8000-000000000004", "off-mod", null, "در ماژول خاموش", 0, true);
    // Re-saving a book lesson from the panel must not duplicate it.
    await db.query(`update tattoo_lessons set title = title || ' (ویرایش)' where id = 'cur-35'`);

    const rows = (await db.query<VisibleLessonRow>(VISIBLE_LESSON_CARDS_SQL)).rows;
    const merged = mergePanelLessons(book, rows);
    const all = ids(merged);
    assert.equal(new Set(all).size, all.length, "no lesson listed twice");
    assert.equal(all.length, ids(book).length + 2);
    const c14 = chapter(merged, "p5", "c14").lessons;
    const titles = c14.map((lesson) => lesson.title);
    assert.ok(titles.includes("دانستنی‌های سبک گری واش"));
    assert.ok(titles.includes("نحوهٔ اجرای یال شیر در تاتوی رئال"));
    assert.ok(titles.indexOf("دانستنی‌های سبک گری واش") < titles.indexOf("نحوهٔ اجرای یال شیر در تاتوی رئال"));
    assert.ok(!all.includes("11111111-0000-4000-8000-000000000003"), "draft stays hidden");
    assert.ok(!all.includes("11111111-0000-4000-8000-000000000004"), "switched-off module stays hidden");
    for (const lesson of c14.filter((item) => item.source === "panel")) assert.equal(lesson.published, true);
    // Book lesson keeps its book title and place.
    assert.deepEqual(chapter(merged, "p5", "c14").lessons.filter((lesson) => !lesson.source), chapter(book, "p5", "c14").lessons);
    await db.close();
  });
});
