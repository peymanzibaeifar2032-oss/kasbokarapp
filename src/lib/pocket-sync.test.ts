import assert from "node:assert/strict";
import test from "node:test";
import { mergePocketJobs, planPocketUpload, sittingKey, type PocketJob } from "./pocket-sync.ts";

function job(partial: Partial<PocketJob> & Pick<PocketJob, "localId" | "customerPhone" | "slotStart" | "origin">): PocketJob {
  return {
    serverId: "",
    customerName: "مشتری",
    customerPhone2: "",
    customerInstagram: "",
    placement: "ساعد",
    style: "رئال",
    idea: "",
    sizeCm: "۱۰",
    priceMinToman: 0,
    paidToman: 0,
    sessionMinutes: 180,
    ...partial,
  };
}

test("the same phone on the same Tehran day is not uploaded twice", () => {
  const remote = [job({ localId: "s1", serverId: "srv-1", customerPhone: "09120926686", slotStart: "2026-10-28T07:30:00.000Z", origin: "site", customerName: "محمد رضائی" })];
  const local = [
    job({ localId: "p1", customerPhone: "۰۹۱۲۰۹۲۶۶۸۶", slotStart: "2026-10-28T10:00:00.000Z", origin: "phone", customerName: "محمد رضائی" }),
    job({ localId: "p2", customerPhone: "09120000000", slotStart: "2026-10-29T07:30:00.000Z", origin: "phone", customerName: "نفر جدید" }),
  ];
  const plan = planPocketUpload(local, remote);
  assert.deepEqual(plan.linked, [{ localId: "p1", serverId: "srv-1" }]);
  assert.equal(plan.upload.length, 1);
  assert.equal(plan.upload[0].localId, "p2");
  assert.equal(sittingKey("09120926686", "2026-10-28T07:30:00.000Z"), sittingKey("09120926686", "2026-10-28T18:00:00.000Z"));
});

test("a site download keeps failed phone rows and drops linked copies", () => {
  const local = [job({ localId: "p1", customerPhone: "09120000000", slotStart: "2026-11-01T08:00:00.000Z", origin: "phone" })];
  const remote = [job({ localId: "s1", serverId: "srv-9", customerPhone: "09121111111", slotStart: "2026-11-02T08:00:00.000Z", origin: "site" })];
  const merged = mergePocketJobs(local, remote, [], [{ localId: "p1", error: "تداخل" }]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].serverId, "srv-9");
  assert.equal(merged[1].syncError, "تداخل");
  const gone = mergePocketJobs(local, remote, [{ localId: "p1", serverId: "srv-1" }], []);
  assert.equal(gone.length, 1);
  assert.equal(gone[0].serverId, "srv-9");
});
