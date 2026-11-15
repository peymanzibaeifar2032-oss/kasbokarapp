import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildApprenticeReport, codeStatus, deviceTail, lessonsFromIndex, maskCode, OWNER_CODE_NOTE } from "./apprentice-stats.ts";
import { teachGate } from "./owner-gate.ts";

const parts = [
  { id: "p1", title: "بخش ۱", level: "مبتدی" },
  { id: "p2", title: "بخش ۲", level: "پیشرفته" },
];
const lessons = [
  { id: "l1", seq: 1, title: "ایمنی", partId: "p1", partTitle: "بخش ۱", chapterTitle: "فصل ۱" },
  { id: "l2", seq: 2, title: "ابزار", partId: "p1", partTitle: "بخش ۱", chapterTitle: "فصل ۱" },
  { id: "l3", seq: 3, title: "سایه", partId: "p2", partTitle: "بخش ۲", chapterTitle: "فصل ۲" },
  { id: "l4", seq: 4, title: "یال شیر", partId: "p2", partTitle: "بخش ۲", chapterTitle: "فصل ۲" },
];
const now = Date.parse("2026-11-15T12:00:00Z");
const code = (id: string, extra: Record<string, unknown> = {}) => ({
  id, code: `TT-AAAA-BBBB-${id.toUpperCase()}`, note: "", isActive: true, maxDevices: 1, usedCount: 0, expiresAt: null, createdAt: "2026-11-01T00:00:00Z", ...extra,
});

describe("owner-only apprentice report", () => {
  const report = buildApprenticeReport({
    now,
    parts,
    lessons,
    titles: { gone: "درس پنهان‌شده" },
    codes: [
      code("aa", { note: "سارا", usedCount: 1 }),
      code("bb", { note: "", createdAt: "2026-11-10T00:00:00Z" }),
      code("cc", { note: "علی", isActive: false }),
      code("oo", { note: OWNER_CODE_NOTE, maxDevices: 2 }),
      code("ee", { note: "منقضی", expiresAt: "2026-11-02T00:00:00Z" }),
    ],
    access: [
      { codeId: "aa", deviceId: "device-sara-123456789", activatedAt: "2026-11-02T08:00:00Z", lastSeen: "2026-11-14T09:00:00Z", isBlocked: false },
      { codeId: "cc", deviceId: "device-ali-000000", activatedAt: "2026-11-03T08:00:00Z", lastSeen: "2026-11-05T09:00:00Z", isBlocked: true },
    ],
    events: [
      { codeId: "aa", lessonId: "l1", opens: 3, firstOpenAt: "2026-11-02T09:00:00Z", lastOpenAt: "2026-11-12T09:00:00Z", completedAt: "2026-11-02T09:30:00Z" },
      { codeId: "aa", lessonId: "l3", opens: 1, firstOpenAt: "2026-11-14T10:00:00Z", lastOpenAt: "2026-11-14T10:00:00Z", completedAt: null },
      { codeId: "aa", lessonId: "gone", opens: 2, firstOpenAt: "2026-11-03T10:00:00Z", lastOpenAt: "2026-11-03T10:00:00Z", completedAt: "2026-11-03T10:10:00Z" },
      { codeId: "cc", lessonId: "l4", opens: 0, firstOpenAt: null, lastOpenAt: null, completedAt: "2026-11-05T08:00:00Z" },
    ],
  });
  const byId = Object.fromEntries(report.apprentices.map((row) => [row.codeId, row]));

  it("lists every code, including ones with no activity and no device", () => {
    assert.equal(report.apprentices.length, 5);
    assert.equal(byId.bb.lessons.length, 0);
    assert.equal(byId.bb.devicesUsed, 0);
    assert.equal(byId.bb.percent, 0);
    assert.equal(byId.bb.lastActivityAt, null);
    assert.equal(byId.bb.label, "TT-••••-BB");
  });

  it("counts progress only against lessons apprentices can see, and keeps hidden ones in the detail", () => {
    const sara = byId.aa;
    assert.equal(sara.total, 4);
    assert.equal(sara.completed, 1);
    assert.equal(sara.opened, 2);
    assert.equal(sara.percent, 25);
    assert.deepEqual(sara.lessons.map((row) => row.lessonId), ["l1", "l3", "gone"]);
    const gone = sara.lessons.find((row) => row.lessonId === "gone");
    assert.equal(gone?.visible, false);
    assert.equal(gone?.title, "درس پنهان‌شده");
    assert.deepEqual(sara.parts.map((part) => [part.partId, part.completed, part.total, part.percent, part.opened]), [["p1", 1, 2, 50, 1], ["p2", 0, 2, 0, 1]]);
    assert.equal(sara.lessons.reduce((n, row) => n + row.opens, 0), 6);
  });

  it("takes the latest of lesson activity and device last-seen, and names the last lesson", () => {
    assert.equal(byId.aa.lastActivityAt, "2026-11-14T10:00:00.000Z");
    assert.equal(byId.aa.lastLessonTitle, "سایه");
    assert.equal(byId.cc.lastActivityAt, "2026-11-05T09:00:00.000Z");
  });

  it("reports status, devices and blocked devices", () => {
    assert.equal(byId.aa.status, "active");
    assert.equal(byId.cc.status, "inactive");
    assert.equal(byId.ee.status, "expired");
    assert.equal(byId.cc.devicesBlocked, 1);
    assert.equal(byId.aa.devices[0].device, "…456789");
  });

  it("sorts recent activity first and the owner's own code last, and leaves it out of the totals", () => {
    assert.deepEqual(report.apprentices.map((row) => row.codeId), ["aa", "cc", "bb", "ee", "oo"]);
    assert.equal(byId.oo.isOwnerCode, true);
    assert.deepEqual(report.totals, { codes: 4, activeCodes: 2, withDevice: 2, withActivity: 2, totalLessons: 4, averagePercent: 13 });
    assert.equal(report.timeZone, "Asia/Tehran");
  });

  it("masks codes and device ids", () => {
    assert.equal(maskCode("TT-RZLS-MW22-28"), "TT-••••-28");
    assert.equal(deviceTail("abc"), "abc");
    assert.equal(codeStatus({ isActive: true, expiresAt: null }, now), "active");
  });

  it("reads only published lessons from the class index, in order", () => {
    const shaped = lessonsFromIndex({
      parts: [{ id: "p1", title: "ب۱", level: "مبتدی", chapters: [{ title: "ف۱", lessons: [
        { id: "a", seq: 1, title: "الف", published: true },
        { id: "b", seq: 2, title: "ب", published: false },
        { id: "c", seq: 3, title: "پ", published: true },
      ] }] }],
    });
    assert.deepEqual(shaped.lessons.map((row) => `${row.seq}:${row.id}:${row.chapterTitle}`), ["1:a:ف۱", "3:c:ف۱"]);
    assert.equal(shaped.parts[0].level, "مبتدی");
  });
});

describe("studio/teach API gate", () => {
  it("refuses a request with no session", () => {
    assert.equal(teachGate({ secFetchSite: "same-origin", sessionEmail: null })?.status, 401);
    assert.equal(teachGate({ secFetchSite: null, sessionEmail: undefined })?.status, 401);
  });
  it("refuses a signed-in user who is not the studio owner, including look-alike addresses", () => {
    assert.equal(teachGate({ secFetchSite: "same-origin", sessionEmail: "someone@gmail.com" })?.status, 401);
    assert.equal(teachGate({ secFetchSite: "same-origin", sessionEmail: "peyman.zibaeifar2032@gmail.com.evil.io" })?.status, 401);
  });
  it("refuses cross-site browser requests even with the owner's session", () => {
    assert.equal(teachGate({ secFetchSite: "cross-site", sessionEmail: "peyman.zibaeifar2032@gmail.com" })?.status, 403);
  });
  it("lets the owner's own session through", () => {
    assert.equal(teachGate({ secFetchSite: "same-origin", sessionEmail: "Peyman.Zibaeifar2032@gmail.com" }), null);
    assert.equal(teachGate({ secFetchSite: "none", sessionEmail: "peymanzibaeifar2032@googlemail.com" }), null);
  });
});
