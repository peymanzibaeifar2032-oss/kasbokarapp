import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { canSeePractice, cleanAudio, cleanImage, publish, rankForYou, shouldNotify, storyTap, visibleToEveryone, type HubPost } from "./tattoohub.ts";

describe("tattoohub feed", () => {
  it("shows one artist's post to everyone else", () => {
    const mine: HubPost = { id: "p1", userId: "arya", caption: "خط نازک", image: "", createdAt: 10 };
    const older: HubPost = { id: "p0", userId: "sara", caption: "هیلد", image: "", createdAt: 5 };
    const feed = visibleToEveryone(publish([older], mine));
    assert.deepEqual(feed.map((item) => item.userId), ["arya", "sara"]);
  });

  it("rejects a raw file and accepts a short voice clip", () => {
    assert.throws(() => cleanImage("file:///sdcard/photo.jpg"), /گالری/);
    assert.equal(cleanImage(`data:image/jpeg;base64,${"a".repeat(80)}`).startsWith("data:image/jpeg;base64,"), true);
    assert.equal(cleanAudio("data:audio/webm;base64,AAAA").startsWith("data:audio/webm;base64,"), true);
    assert.throws(() => cleanAudio("data:text/plain;base64,AAAA"), /ویس/);
  });

  it("ranks a followed style match above an older popular post", () => {
    const now = Date.now();
    const ranked = rankForYou(
      [
        { id: "old", userId: "stranger", caption: "", image: "", createdAt: now - 50 * 3600_000, style: "tribal", likes: 20 },
        { id: "mine", userId: "friend", caption: "", image: "", createdAt: now, style: "realism", likes: 0 },
      ],
      { following: ["friend"], styles: ["realism"] },
    );
    assert.equal(ranked[0].id, "mine");
    assert.equal(canSeePractice({ userId: "student", practice: true, mentorId: "teacher" }, "teacher"), true);
    assert.equal(canSeePractice({ userId: "student", practice: true, mentorId: "teacher" }, "other"), false);
  });

  it("keeps the story still while the reply box is used", () => {
    assert.equal(storyTap("dock", 20, 400, false), "stay");
    assert.equal(storyTap("edge", 20, 400, true), "stay");
    assert.equal(storyTap("edge", 20, 400, false), "prev");
    assert.equal(storyTap("edge", 300, 400, false), "next");
  });

  it("pings a new message only when that chat is not open", () => {
    assert.equal(shouldNotify("m1", "m2", false), true);
    assert.equal(shouldNotify("m1", "m2", true), false);
    assert.equal(shouldNotify("m2", "m2", false), false);
  });

  it("the public query is not limited to the author", () => {
    const route = readFileSync(new URL("./server/tattoohub-api.ts", import.meta.url), "utf8");
    assert.match(route, /from tattoohub_posts/);
    assert.match(route, /read_at/);
    assert.match(route, /tattoohub_follows/);
    assert.match(route, /tattoohub_typing/);
    assert.match(route, /\$4::text = 'all'/);
    const page = readFileSync(new URL("../../public/tattoohub/index.html", import.meta.url), "utf8");
    assert.match(page, /اشتراک‌گذاری/);
    assert.match(page, /در حال نوشتن/);
    assert.match(page, /پیمان زیبائی‌فر/);
    assert.match(route, /پاسخ استوری/);
    assert.match(page, /1\.2\.1/);
    assert.match(page, /خروج از حساب/);
    assert.match(page, /دنبال‌شده‌ها/);
    assert.match(page, /هایلایت/);
  });
});
