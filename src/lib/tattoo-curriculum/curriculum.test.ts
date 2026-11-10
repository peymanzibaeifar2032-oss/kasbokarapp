import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, GLOSSARY, LESSONS, PARTS, SOURCES, lessonView, replacedOldLessonIds, tableOfContents } from "./index.ts";

describe("tattoo curriculum v2", () => {
  it("has 39 lessons with unique stable ids in chapter order", () => {
    assert.equal(LESSONS.length, 39);
    assert.deepEqual(LESSONS.map((l) => l.id), Array.from({ length: 39 }, (_, i) => `cur-${String(i + 1).padStart(2, "0")}`));
  });
  it("every reference resolves", () => {
    const src = new Set(SOURCES.map((s) => s.id));
    const gl = new Set(GLOSSARY.map((g) => g.id));
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const l of LESSONS) {
      assert.ok(CHAPTERS.some((c) => c.id === l.chapter && c.part === l.part), `${l.id} chapter`);
      assert.ok(PARTS.some((p) => p.id === l.part), `${l.id} part`);
      for (const s of l.sources) assert.ok(src.has(s), `${l.id} source ${s}`);
      for (const g of l.glossary) assert.ok(gl.has(g), `${l.id} glossary ${g}`);
      for (const r of l.related) assert.ok(ids.has(r), `${l.id} related ${r}`);
      assert.ok(l.sources.length > 0, `${l.id} needs a source`);
      for (const img of l.images) assert.ok(img.alt && img.caption && img.credit && img.license, `${img.id} metadata`);
    }
  });
  it("maps each of the 129 old lessons exactly once", () => {
    const all = LESSONS.flatMap((l) => l.replaces);
    assert.equal(all.length, 129);
    assert.equal(new Set(all).size, 129);
  });
  it("unpublished chapters stay hidden and nothing is archived before its replacement is live", () => {
    assert.equal(lessonView("cur-01", []), null);
    assert.deepEqual(replacedOldLessonIds([]), []);
    const toc = tableOfContents(["c01"]);
    assert.equal(toc[0].chapters[0].lessons.every((l) => l.published), true);
    assert.equal(toc[0].chapters[1].lessons.some((l) => l.published), false);
    assert.ok(lessonView("cur-01", ["c01"]));
    assert.deepEqual(replacedOldLessonIds(["c01"]), LESSONS.filter((l) => l.chapter === "c01").flatMap((l) => l.replaces));
  });
  it("held lessons stay off even in a live chapter", async () => {
    const { HELD_LESSONS, isPublished } = await import("./index.ts");
    for (const id of Object.keys(HELD_LESSONS)) {
      const l = LESSONS.find((x) => x.id === id)!;
      assert.equal(isPublished(l, [l.chapter]), false);
      assert.equal(lessonView(id, [l.chapter]), null);
    }
  });
  it("every mapped reading exists and is editor-approved text", async () => {
    const { READING_FOR_LESSON, READINGS } = await import("./index.ts");
    const { READING_TEXT } = await import("./readings.generated.ts");
    for (const name of Object.values(READING_FOR_LESSON)) {
      assert.ok(READINGS[name], name);
      assert.ok(READING_TEXT[name]?.length > 1000, `${name} text`);
      assert.ok(!READING_TEXT[name].includes("نیاز به تأیید"), `${name} has unverified marker`);
    }
  });
  it("ships an image for every slot", async () => {
    const { CURRICULUM_IMAGES } = await import("./images.generated.ts");
    for (const l of LESSONS) for (const img of l.images) assert.ok(CURRICULUM_IMAGES[img.id]?.length > 1000, `${img.id} image`);
  });
});
