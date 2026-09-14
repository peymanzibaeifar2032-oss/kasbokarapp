import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSlots } from "../hours.ts";
import {
  anyStaffGrid,
  assignResourceAtIso,
  eligibleResources,
  filterOccupancy,
  hasActiveResources,
  occupancyHitsResource,
  pickResourceForSlot,
  resourcesConflict,
  unionFreeIsos,
  type BusinessResource,
  type OccupancyHit,
} from "./resources.ts";

const hit = (start: string, end: string, resourceId: string | null = null): OccupancyHit => ({
  start,
  end,
  resourceId,
});

const HOURS = [
  { day: "شنبه", open: "09:00", close: "18:00" },
  { day: "یکشنبه", open: "09:00", close: "18:00" },
  { day: "دوشنبه", open: "09:00", close: "18:00" },
  { day: "سه‌شنبه", open: "09:00", close: "18:00" },
  { day: "چهارشنبه", open: "09:00", close: "18:00" },
  { day: "پنجشنبه", open: "09:00", close: "18:00" },
  { day: "جمعه", open: "09:00", close: "18:00", closed: true },
];

/** Saturday 12 Sep 2026 08:00 Asia/Tehran. */
const SAT = new Date("2026-09-12T04:30:00.000Z");

const staff = (id: string, titles: string[] = []): BusinessResource => ({
  id,
  businessId: "b1",
  kind: "staff",
  name: id,
  color: null,
  active: true,
  sortOrder: 0,
  serviceTitles: titles,
});

describe("resource occupancy contract", () => {
  it("legacy business without resources is business-wide", () => {
    assert.equal(hasActiveResources([]), false);
    assert.equal(resourcesConflict("A", "B", false), true);
    assert.equal(occupancyHitsResource(hit("1", "2", "A"), "B", false), true);
  });

  it("NULL/wildcard occupies every resource", () => {
    assert.equal(resourcesConflict(null, "A", true), true);
    assert.equal(resourcesConflict("A", null, true), true);
    assert.equal(resourcesConflict("", "A", true), true);
  });

  it("A does not collide with B when both are assigned", () => {
    assert.equal(resourcesConflict("A", "B", true), false);
    assert.equal(resourcesConflict("A", "A", true), true);
  });

  it("filters occupancy for one staff plus wildcards", () => {
    const hits = [hit("1", "2", "A"), hit("3", "4", "B"), hit("5", "6", null)];
    const forA = filterOccupancy(hits, "A", true);
    assert.deepEqual(
      forA.map((h) => h.resourceId ?? "wild"),
      ["A", "wild"],
    );
  });

  it("Any Staff is the UNION of free slots", () => {
    const union = unionFreeIsos([
      ["t1", "t2"],
      ["t2", "t3"],
      [],
    ]);
    assert.deepEqual(union, ["t1", "t2", "t3"]);
  });

  it("picks the first staff that is free at the slot (concurrency assignment)", () => {
    const picked = pickResourceForSlot(
      [{ id: "A" }, { id: "B" }, { id: "C", active: false }],
      "t1",
      (id, iso) => id === "B" && iso === "t1",
    );
    assert.equal(picked, "B");
  });

  it("race: two clients on the same staff conflict; A↔B do not", () => {
    const sameStaff = resourcesConflict("A", "A", true);
    const otherStaff = resourcesConflict("A", "B", true);
    assert.equal(sameStaff, true);
    assert.equal(otherStaff, false);
  });

  it("service mapping restricts eligible staff", () => {
    const list = [staff("A", ["تاتو"]), staff("B", ["اصلاح"])];
    assert.deepEqual(eligibleResources(list, "تاتو").map((r) => r.id), ["A"]);
    assert.deepEqual(eligibleResources(list, "رنگ").map((r) => r.id), ["A", "B"]);
  });
});

describe("staff-aware slots", () => {
  const biz = { workHours: HOURS, slotMinutes: 60 };
  const startA = "2026-09-12T05:30:00.000Z"; // 09:00 Tehran
  const endA = "2026-09-12T06:30:00.000Z";

  it("A occupancy does not fill B", () => {
    const hits = [hit(startA, endA, "A")];
    const freeB = buildSlots(biz, filterOccupancy(hits, "B", true), 1, SAT, 60);
    const freeA = buildSlots(biz, filterOccupancy(hits, "A", true), 1, SAT, 60);
    assert.equal(freeA.some((s) => s.iso === startA), false);
    assert.equal(freeB.some((s) => s.iso === startA), true);
  });

  it("wildcard occupancy fills A and B", () => {
    const hits = [hit(startA, endA, null)];
    const freeA = buildSlots(biz, filterOccupancy(hits, "A", true), 1, SAT, 60);
    assert.equal(freeA.some((s) => s.iso === startA), false);
  });

  it("legacy occupancy is business-wide", () => {
    const hits = [hit(startA, endA, "A")];
    const free = buildSlots(biz, filterOccupancy(hits, "B", false), 1, SAT, 60);
    assert.equal(free.some((s) => s.iso === startA), false);
  });

  it("Any Staff union still has a slot if only A is busy", () => {
    const hits = [hit(startA, endA, "A")];
    const grid = anyStaffGrid(biz, hits, [staff("A"), staff("B")], 1, SAT, 60);
    const row = grid.find((s) => s.iso === startA);
    assert.equal(row?.state, "free");
  });

  it("Any Staff assignment picks free staff B", () => {
    const hits = [hit(startA, endA, "A")];
    const picked = assignResourceAtIso(biz, hits, [staff("A"), staff("B")], startA, 1, SAT, 60);
    assert.equal(picked, "B");
  });
});
