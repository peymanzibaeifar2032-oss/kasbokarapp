import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lessonFallback, retrieveLessons } from "./apprentice-lessons.ts";

describe("apprentice lessons", () => {
  it("answers needle gauge from the diameter lesson", () => {
    const lessons = retrieveLessons("گیج ۱۲ سوزن چند میلی‌متر است؟");
    assert.equal(lessons[0]?.id, "gauge");
    assert.match(lessonFallback(lessons), /۰٫۳۵/);
    assert.match(lessonFallback(lessons), /۰٫۲۵/);
  });

  it("does not invent a lesson for an unrelated question", () => {
    const lessons = retrieveLessons("فردا هوا بارانی است؟");
    assert.equal(lessons[0]?.id, "map");
  });
});
