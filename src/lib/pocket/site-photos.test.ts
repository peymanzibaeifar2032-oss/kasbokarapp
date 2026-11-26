import assert from "node:assert/strict";
import { test } from "node:test";
import { indexedDB } from "fake-indexeddb";
(globalThis as { indexedDB?: IDBFactory }).indexedDB = indexedDB;
const { syncSitePhotos, getSitePhoto, parseSitePhotoReply } = await import("./site-photos.ts");
const { parsePocketExport } = await import("./sync-response.ts");
const { applyDownload, listPocketBookings, savePocketBookings } = await import("../pocket-book.ts");

// Synthetic fixtures only (valid data-URL syntax, not real images or customers).
const img = (c: string) => `data:image/jpeg;base64,${c.repeat(64)}`;
const keyA = "d" + "a".repeat(32);
const keyB = "f11111111-2222-3333-4444-555555555555";
const row = (serverId: string, photoKey: string) => ({
  serverId, day: "1405-09-05", time: "11:00", name: "نمونه", phone: "", style: "", placement: "",
  phone2: "", instagram: "", sizeCm: "", priceMinToman: 0, paidToman: 0, bookingId: "", slotStart: "", photoKey,
});

test("export parser keeps a valid photoKey and drops a malformed one without failing the sync", () => {
  const out = parsePocketExport(200, { bookings: [row("s1", keyA), row("s2", keyB), row("s3", "javascript:alert(1)")] });
  assert.equal(out[0].server?.photoKey, keyA);
  assert.equal(out[1].server?.photoKey, keyB);
  assert.equal(out[2].server?.photoKey, "");
});

test("photoKey survives the merge for pinned (locally edited) and plain rows", () => {
  const incoming = parsePocketExport(200, { bookings: [row("s1", keyA), row("s2", keyB)] });
  const local = [{ id: "x", day: "1405-09-05", name: "ویرایش محلی", phone: "", style: "", placement: "", time: "", note: "", serverId: "s1", pinned: true }];
  const next = applyDownload(local, incoming);
  assert.equal(next.find((r) => r.serverId === "s1")?.server?.photoKey, keyA);
  assert.equal(next.find((r) => r.serverId === "s1")?.name, "ویرایش محلی");
  assert.equal(next.find((r) => r.serverId === "s2")?.server?.photoKey, keyB);
});

test("photo reply rejects non-image data and unknown key shapes", () => {
  assert.throws(() => parseSitePhotoReply(200, { photos: [{ serverId: "s1", key: keyA, data: "data:text/html;base64,AAAA" }] }));
  assert.throws(() => parseSitePhotoReply(200, { photos: [{ serverId: "s1", key: "zz", data: img("A") }] }));
  assert.throws(() => parseSitePhotoReply(403, {}));
  assert.equal(parseSitePhotoReply(200, { photos: [], missing: ["s1"] }).missing.length, 1);
});

test("sync caches images offline in batches, follows deferred ids, skips unchanged keys", async () => {
  const calls: string[][] = [];
  const server = new Map([["s1", { key: keyA, data: img("A") }], ["s2", { key: keyB, data: img("B") }], ["s5", { key: "d" + "b".repeat(32), data: img("C") }]]);
  let deferOnce = true;
  const fetchBatch = async (ids: string[]) => {
    calls.push(ids);
    const photos = [];
    const deferred: string[] = [];
    const missing: string[] = [];
    for (const id of ids) {
      const p = server.get(id);
      if (!p) missing.push(id);
      else if (id === "s2" && deferOnce && ids.length > 1) { deferOnce = false; deferred.push(id); }
      else photos.push({ serverId: id, key: p.key, data: p.data });
    }
    return { photos, missing, deferred };
  };
  const wanted = [
    { serverId: "s1", photoKey: keyA }, { serverId: "s2", photoKey: keyB }, { serverId: "s3", photoKey: "d" + "c".repeat(32) },
    { serverId: "s4", photoKey: "" }, { serverId: "s5", photoKey: "d" + "b".repeat(32) },
  ];
  const r = await syncSitePhotos(wanted, fetchBatch);
  assert.deepEqual(r, { saved: 3, missing: 1, failed: false, pending: 0 });
  assert.ok(calls.every((c) => c.length <= 4));
  assert.equal((await getSitePhoto("s2"))?.data, img("B"));
  assert.equal(await getSitePhoto("s4"), null);
  calls.length = 0;
  const again = await syncSitePhotos(wanted, fetchBatch);
  assert.equal(again.saved, 0);
  assert.deepEqual(calls, [["s3"]], "only the one the site could not serve is asked again");
});

test("network failure stops quietly; cached images and appointments stay", async () => {
  await savePocketBookings([{ id: "k1", day: "1405-09-05", name: "ماندگار", phone: "", style: "", placement: "", time: "", note: "", serverId: "s1", pinned: true }]);
  const r = await syncSitePhotos([{ serverId: "s9", photoKey: keyA }], async () => { throw new Error("offline"); });
  assert.equal(r.failed, true);
  assert.equal(r.pending, 1);
  assert.equal((await getSitePhoto("s1"))?.data, img("A"));
  assert.equal((await listPocketBookings()).length, 1);
});
