import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { cleanImage, publish, visibleToEveryone, type HubPost } from "./tattoohub.ts";

describe("tattoohub feed", () => {
  it("shows one artist's post to everyone else", () => {
    const mine: HubPost = { id: "p1", userId: "arya", caption: "خط نازک", image: "", createdAt: 10 };
    const older: HubPost = { id: "p0", userId: "sara", caption: "هیلد", image: "", createdAt: 5 };
    const feed = visibleToEveryone(publish([older], mine));
    assert.deepEqual(feed.map((item) => item.userId), ["arya", "sara"]);
    assert.equal(feed.find((item) => item.userId === "arya")?.caption, "خط نازک");
  });

  it("rejects a raw file path and accepts a gallery data URL", () => {
    assert.throws(() => cleanImage("file:///sdcard/photo.jpg"), /گالری/);
    const tiny = `data:image/jpeg;base64,${"a".repeat(80)}`;
    assert.equal(cleanImage(tiny).startsWith("data:image/jpeg;base64,"), true);
    assert.throws(() => cleanImage(`data:image/jpeg;base64,${"a".repeat(500_000)}`), /بزرگ/);
  });

  it("the public query is not limited to the author", () => {
    const route = readFileSync(new URL("./server/tattoohub-api.ts", import.meta.url), "utf8");
    assert.match(route, /from tattoohub_posts/);
    assert.doesNotMatch(route, /p\.user_id = \$/);
    const page = readFileSync(new URL("../../public/tattoohub/index.html", import.meta.url), "utf8");
    assert.match(page, /انتشار پست/);
    assert.match(page, /انتخاب عکس از گالری/);
    assert.match(page, /id="preview"/);
    assert.match(page, /پیمان زیبائی‌فر/);
    assert.match(page, /1\.0\.1/);
  });
});
