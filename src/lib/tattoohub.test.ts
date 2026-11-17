import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { cleanAudio, cleanImage, publish, shouldNotify, visibleToEveryone, type HubPost } from "./tattoohub.ts";

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

  it("pings a new message only when that chat is not open", () => {
    assert.equal(shouldNotify("m1", "m2", false), true);
    assert.equal(shouldNotify("m1", "m2", true), false);
    assert.equal(shouldNotify("m2", "m2", false), false);
  });

  it("the public query is not limited to the author", () => {
    const route = readFileSync(new URL("./server/tattoohub-api.ts", import.meta.url), "utf8");
    assert.match(route, /from tattoohub_posts/);
    assert.match(route, /read_at/);
    assert.match(route, /tattoohub_typing/);
    assert.doesNotMatch(route, /p\.user_id = \$/);
    const page = readFileSync(new URL("../../public/tattoohub/index.html", import.meta.url), "utf8");
    assert.match(page, /اشتراک‌گذاری/);
    assert.match(page, /در حال نوشتن/);
    assert.match(page, /پیمان زیبائی‌فر/);
    assert.match(page, /1\.1\.0/);
  });
});
