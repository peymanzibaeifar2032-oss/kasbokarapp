import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeLabel, isActivityKind, rankCodes, rankLessons } from "./activity.ts";

describe("class lesson activity", () => {
  it("accepts only open and complete", () => {
    assert.equal(isActivityKind("open"), true);
    assert.equal(isActivityKind("complete"), true);
    assert.equal(isActivityKind("delete"), false);
    assert.equal(isActivityKind(undefined), false);
  });

  it("ranks the most active code first, finished lessons weigh more", () => {
    const ranked = rankCodes([
      { codeId: "a", code: "TT-A", note: "", opens: 9, completes: 0, lessons: 3, lastAt: "2026-11-10T10:00:00Z" },
      { codeId: "b", code: "TT-B", note: "سارا", opens: 2, completes: 3, lessons: 3, lastAt: "2026-11-09T10:00:00Z" },
      { codeId: "c", code: "TT-C", note: "", opens: 1, completes: 0, lessons: 1, lastAt: "2026-11-11T10:00:00Z" },
    ]);
    assert.deepEqual(ranked.map((row) => row.codeId), ["b", "a", "c"]);
    assert.equal(codeLabel(ranked[0]), "سارا");
    assert.equal(codeLabel(ranked[1]), "TT-A");
  });

  it("ranks lessons by distinct readers, then opens", () => {
    const ranked = rankLessons([
      { lessonId: "x", title: "خط", opens: 10, readers: 1, completes: 1 },
      { lessonId: "y", title: "سایه", opens: 3, readers: 3, completes: 0 },
      { lessonId: "z", title: "رنگ", opens: 5, readers: 3, completes: 2 },
    ]);
    assert.deepEqual(ranked.map((row) => row.lessonId), ["z", "y", "x"]);
  });
});
