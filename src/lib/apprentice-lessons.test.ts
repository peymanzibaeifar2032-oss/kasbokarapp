import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { retrieveLessons, teachApprentice } from "./apprentice-lessons.ts";

describe("apprentice lessons", () => {
  it("answers needle gauge from the diameter lesson", () => {
    const lessons = retrieveLessons("گیج ۱۲ سوزن چند میلی‌متر است؟");
    assert.equal(lessons[0]?.id, "gauge");
    assert.match(teachApprentice("گیج ۱۲ سوزن چند میلی‌متر است؟"), /۰٫۳۵/);
  });

  it("answers what the client should have done before the session", () => {
    const answer = teachApprentice("مشتری روز اجرا وقتی میاد باید چه کارهایی انجام داده باشه");
    assert.match(answer, /الکل/);
    assert.match(answer, /خواب/);
    assert.doesNotMatch(answer, /جواب زنده نرسید/);
  });
});