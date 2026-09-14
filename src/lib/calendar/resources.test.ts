import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSlots } from "../hours.ts";
import {
  RESOURCE_KINDS,
  SLICE1_CAPACITY,
  anyStaffGrid,
  assignResourceAtIso,
  effectiveSchedule,
  eligibleResources,
  filterOccupancy,
  hasActiveResources,
  intersectSpecialDays,
  intersectWeeklyHours,
  occupancyHitsResource,
  persistableResourceId,
  pickResourceForSlot,
  resolveRescheduleResource,
  resourcesConflict,
  slotsForResource,
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
const startA = "2026-09-12T05:30:00.000Z"; // 09:00 Tehran
const endA = "2026-09-12T06:30:00.000Z";
const eleven = "2026-09-12T07:30:00.000Z"; // 11:00 Tehran

const staff = (id: string, extra: Partial<BusinessResource> = {}): BusinessResource => ({
  id,
  businessId: "b1",
  kind: "staff",
  name: id,
  color: null,
  active: true,
  sortOrder: 0,
  capacity: SLICE1_CAPACITY,
  ...extra,
});

describe("resource occupancy contract", () => {
  it("legacy business without resources is business-wide", () => {
    assert.equal(hasActiveResources([]), false);
    assert.equal(resourcesConflict("A", "B", false), true);
    assert.equal(occupancyHitsResource(hit("1", "2", "A"), "B", false), true);
  });

  it("NULL vs R, R vs NULL, and NULL vs NULL all conflict", () => {
    assert.equal(resourcesConflict(null, "A", true), true);
    assert.equal(resourcesConflict("A", null, true), true);
    assert.equal(resourcesConflict(null, null, true), true);
    assert.equal(resourcesConflict("", "A", true), true);
  });

  it("R vs R overlap; R vs S parallel", () => {
    assert.equal(resourcesConflict("A", "A", true), true);
    assert.equal(resourcesConflict("A", "B", true), false);
  });

  it("filters occupancy for one staff plus wildcards", () => {
    const hits = [hit("1", "2", "A"), hit("3", "4", "B"), hit("5", "6", null)];
    const forA = filterOccupancy(hits, "A", true);
    assert.deepEqual(
      forA.map((h) => h.resourceId ?? "wild"),
      ["A", "wild"],
    );
  });

  it("hold occupancy uses the same wildcard matrix", () => {
    assert.equal(resourcesConflict(null, "R", true), true);
    assert.equal(resourcesConflict("R", null, true), true);
    assert.equal(resourcesConflict("R", "S", true), false);
    assert.equal(resourcesConflict("R", "R", true), true);
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
    assert.notEqual(picked, null);
  });

  it("race retry skips a consumed resource and never writes NULL", () => {
    const picked = pickResourceForSlot(
      [{ id: "A" }, { id: "B" }],
      "t1",
      () => true,
      ["A"],
    );
    assert.equal(picked, "B");
    const none = pickResourceForSlot([{ id: "A" }, { id: "B" }], "t1", () => true, ["A", "B"]);
    assert.equal(none, null);
    assert.equal(persistableResourceId(true, none), null);
    assert.equal(persistableResourceId(true, "B"), "B");
    assert.equal(persistableResourceId(false, null), null);
  });

  it("Phase 1 eligibility is all active resources", () => {
    const list = [staff("A"), staff("B", { active: false }), staff("C")];
    assert.deepEqual(eligibleResources(list, "تاتو").map((r) => r.id), ["A", "C"]);
  });

  it("kinds are exactly staff/chair/room/equipment and capacity is 1", () => {
    assert.deepEqual([...RESOURCE_KINDS], ["staff", "chair", "room", "equipment"]);
    assert.equal(SLICE1_CAPACITY, 1);
    assert.equal(RESOURCE_KINDS.includes("other" as never), false);
    assert.equal(RESOURCE_KINDS.includes("chair"), true);
  });
});

describe("staff-aware slots", () => {
  const biz = { workHours: HOURS, slotMinutes: 60 };

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

  it("Any Staff assignment picks free staff B and never null when B is free", () => {
    const hits = [hit(startA, endA, "A")];
    const picked = assignResourceAtIso(biz, hits, [staff("A"), staff("B")], startA, 1, SAT, 60);
    assert.equal(picked, "B");
  });

  it("Any Staff retry after A is consumed picks B, then refuses NULL", () => {
    const first = assignResourceAtIso(biz, [], [staff("A"), staff("B")], startA, 1, SAT, 60);
    assert.equal(first, "A");
    const afterA = assignResourceAtIso(biz, [hit(startA, endA, "A")], [staff("A"), staff("B")], startA, 1, SAT, 60);
    assert.equal(afterA, "B");
    const afterBoth = assignResourceAtIso(
      biz,
      [hit(startA, endA, "A"), hit(startA, endA, "B")],
      [staff("A"), staff("B")],
      startA,
      1,
      SAT,
      60,
    );
    assert.equal(afterBoth, null);
    assert.notEqual(afterBoth, "");
  });

  it("reschedule keeps the original resource unless a new one is chosen", () => {
    assert.equal(resolveRescheduleResource(undefined, "A"), "A");
    assert.equal(resolveRescheduleResource(null, "A"), "A");
    assert.equal(resolveRescheduleResource("", "A"), "A");
    assert.equal(resolveRescheduleResource("B", "A"), "B");
    const original = "A";
    const requested: string | undefined = undefined;
    const preserved = resolveRescheduleResource(requested, original);
    assert.equal(preserved, "A");
  });
});

describe("resource schedule intersection", () => {
  it("inherits business hours when the resource has no schedule", () => {
    const hours = intersectWeeklyHours(HOURS, null);
    assert.deepEqual(hours, HOURS);
    const sat = hours.find((h) => h.day === "شنبه");
    assert.equal(sat?.open, "09:00");
  });

  it("resource weekly hours narrow business hours", () => {
    const resourceHours = [{ day: "شنبه", open: "11:00", close: "13:00" }];
    const hours = intersectWeeklyHours(HOURS, resourceHours);
    const sat = hours.find((h) => h.day === "شنبه");
    assert.equal(sat?.closed, undefined);
    assert.equal(sat?.open, "11:00");
    assert.equal(sat?.close, "13:00");
    const biz = { workHours: HOURS, slotMinutes: 60 };
    const free = slotsForResource(biz, [], staff("A", { workHours: resourceHours }), true, 1, SAT, 60);
    assert.equal(free.some((s) => s.iso === startA), false);
    assert.equal(free.some((s) => s.iso === eleven), true);
  });

  it("resource cannot open when business weekly is closed", () => {
    const hours = intersectWeeklyHours(HOURS, [{ day: "جمعه", open: "10:00", close: "16:00" }]);
    const fri = hours.find((h) => h.day === "جمعه");
    assert.equal(fri?.closed, true);
  });

  it("resource special closure removes availability", () => {
    const special = intersectSpecialDays(HOURS, [], [{ dayKey: "2026-09-12", closed: true }]);
    assert.equal(special[0]?.closed, true);
    const biz = { workHours: HOURS, slotMinutes: 60 };
    const free = slotsForResource(
      biz,
      [],
      staff("A", { specialHours: [{ dayKey: "2026-09-12", closed: true }] }),
      true,
      1,
      SAT,
      60,
    );
    assert.equal(free.length, 0);
  });

  it("resource special hours cannot open outside closed business hours", () => {
    const fridayClosed = intersectSpecialDays(
      HOURS,
      [{ dayKey: "2026-09-11", closed: true }],
      [{ dayKey: "2026-09-11", closed: false, shifts: [{ open: "10:00", close: "16:00" }] }],
    );
    assert.equal(fridayClosed[0]?.closed, true);
    assert.deepEqual(fridayClosed[0]?.shifts ?? [], []);
  });

  it("effective schedule keeps Tehran Saturday 09:00 when inherited", () => {
    const { workHours, specialDays } = effectiveSchedule(HOURS, []);
    const biz = { workHours, slotMinutes: 60 };
    const free = buildSlots(biz, [], 1, SAT, 60, { specialDays });
    assert.equal(free.some((s) => s.iso === startA), true);
  });
});
