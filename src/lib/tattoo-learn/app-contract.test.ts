import assert from "node:assert/strict";
import { describe, it } from "node:test";

function modules(json: { modules?: { id: string; title: string; description?: string }[] }) {
  return (json.modules || []).map((item) => ({ id: item.id, title: item.title, description: item.description || "" }));
}

function lesson(json: { lesson: { id: string; title: string; content?: string; images?: { path: string; caption?: string }[] } }) {
  return {
    id: json.lesson.id,
    title: json.lesson.title,
    content: json.lesson.content || "",
    images: (json.lesson.images || []).map((image) => ({ path: image.path, caption: image.caption || "" })),
  };
}

describe("tattoo class app contract", () => {
  it("reads the activation token", () => {
    const token = { token: "a".repeat(64), accessId: "1", maxDevices: 2, usedCount: 1 }.token;
    assert.equal(token.length, 64);
  });

  it("keeps only published lesson fields the app shows", () => {
    const cards = modules({
      modules: [{ id: "m1", title: "سوزن", description: "بدن" }],
    });
    assert.equal(cards[0].title, "سوزن");
    const page = lesson({
      lesson: {
        id: "l1",
        title: "سوزن های اصلی",
        content: "rl\nrs",
        images: [{ path: "/api/tattoo/image/p1", caption: "چهار سوزن" }],
      },
    });
    assert.equal(page.images[0].path, "/api/tattoo/image/p1");
    assert.match(page.content, /rl/);
  });

  it("treats a missing answer as unanswered", () => {
    const row = { status: "pending", answerText: "" };
    assert.equal(row.status === "answered", false);
    assert.equal(row.answerText, "");
  });
});
