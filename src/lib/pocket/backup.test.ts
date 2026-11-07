import assert from "node:assert/strict";
import { test } from "node:test";
import { indexedDB } from "fake-indexeddb";
import {
  parsePocketBackup,
  mergeBackup,
  commitBackup,
  readImportRecovery,
  currentBackup,
} from "./backup.ts";
import { listPocketBookings, savePocketBookings } from "../pocket-book.ts";
import { listTrainees, listTraineePayments } from "./trainees.ts";
import { parsePocketSnapshot } from "./sync-response.ts";
import {
  getProfessionPack,
  PROFESSION_CATEGORIES,
  PROFESSION_PACKS,
  normalizeProfessionSearch,
  professionSearchText,
} from "./professions.ts";
import { SERVICE_CATALOG } from "./service-catalog.ts";
const row = {
  id: "local-1",
  day: "1405-08-16",
  time: "13:45",
  name: "مشتری فارسی",
  phone: "09120000000",
  style: "طرح",
  placement: "بازو",
  note: "یادداشت",
  serverId: null,
  pinned: true,
  professionId: "tattoo_artist",
  customFields: [{ id: "c1", kind: "text", label: "سبک", value: "رئال" }],
  photo: "data:image/jpeg;base64,YWJj",
};
const person = {
  id: "t1",
  name: "هنرجو",
  phone: "",
  sessionGoal: 12,
  sessionsDone: 3,
  feeTotalToman: 500000,
  paidToman: 200000,
  honorific: "",
  notes: "",
  startedOn: "1405-08-01",
  createdAt: "2026-11-01T00:00:00Z",
};
const fixture = () =>
  parsePocketBackup({
    schemaVersion: 2,
    format: "kasbokar-pocket",
    bookings: [row],
    trainees: [person],
    traineePayments: [
      { id: "p1", traineeId: "t1", amountToman: 200000, paidOn: "1405-08-02", note: "شهریه" },
    ],
  });
test("schema round-trip keeps Persian fields, photo, trainees and linked payments", () => {
  const backup = fixture();
  assert.deepEqual(parsePocketBackup(JSON.stringify(backup)), backup);
  assert.equal(backup.bookings[0].customFields?.[0].value, "رئال");
  assert.equal(parsePocketBackup([row]).schemaVersion, 3);
});
test("invalid data cannot reach storage: dates, times, photo URLs, duplicate/prototype keys, orphan payments and future versions", () => {
  for (const patch of [
    { day: "1405-07-31" },
    { time: "25:60" },
    { photo: "javascript:alert(1)" },
    { photo: "https://tracking.invalid/photo" },
    { details: { constructor: "bad" } },
    { priceToman: -1 },
  ])
    assert.throws(() => parsePocketBackup({ bookings: [{ ...row, ...patch }] }));
  assert.throws(() => parsePocketBackup({ bookings: [row, row] }));
  assert.throws(() =>
    parsePocketBackup({
      bookings: [],
      trainees: [],
      traineePayments: [{ id: "p1", traineeId: "absent", amountToman: 1, paidOn: "1405-01-01" }],
    }),
  );
  assert.throws(() => parsePocketBackup({ bookings: [], schemaVersion: 99 }));
});
test("merge preserves local rows by default; reviewed overwrite updates matches without deletion", () => {
  const local = fixture(),
    incoming = fixture();
  incoming.bookings[0].name = "نام جدید";
  incoming.trainees[0].sessionsDone = 8;
  local.bookings.push({ ...local.bookings[0], id: "keep", name: "محلی", serverId: null });
  assert.equal(mergeBackup(local, incoming).bookings[0].name, row.name);
  const next = mergeBackup(local, incoming, true);
  assert.equal(next.bookings[0].name, "نام جدید");
  assert.equal(next.trainees[0].sessionsDone, 8);
  assert.equal(next.bookings.length, 2);
});
test("source catalogue has exact 10 groups and all 109 actual titles; every job has a practical schema", () => {
  assert.equal(SERVICE_CATALOG.length, 10);
  assert.equal(
    SERVICE_CATALOG.reduce((n, c) => n + c.professions.length, 0),
    109,
  );
  assert.equal(PROFESSION_CATEGORIES.flatMap((c) => c.professionIds).length, 109);
  for (const category of PROFESSION_CATEGORIES)
    for (const id of category.professionIds) {
      const pack = PROFESSION_PACKS[id];
      assert.equal(pack.categoryId, category.id);
      assert.ok(pack.fields.some((f) => f.storeAs === "time"));
      assert.ok(pack.fields.some((f) => f.storeAs === "details") || id === "tattoo_artist");
    }
  assert.ok(normalizeProfessionSearch(professionSearchText("tattoo_artist")).includes("تتو"));
  assert.equal(getProfessionPack("doctor").id, "doctor"); // Legacy choice remains valid.
  assert.ok(getProfessionPack("mechanic").fields.some((f) => f.labelFa === "شماره پلاک"));
});
test("missing trainees in old production response is unsupported, not an empty roster", () => {
  assert.equal(parsePocketSnapshot(200, { bookings: [] }).training, undefined);
  assert.deepEqual(
    parsePocketSnapshot(200, { bookings: [], trainees: [], traineePayments: [] }).training,
    { trainees: [], traineePayments: [] },
  );
  assert.throws(() => parsePocketSnapshot(401, { bookings: [], trainees: [] }));
  // 1.14.3: a broken row is skipped and counted instead of discarding the whole roster.
  const broken = parsePocketSnapshot(200, { bookings: [], trainees: [{ name: "broken" }] });
  assert.equal(broken.training?.trainees.length, 0);
  assert.equal(broken.trainingSkipped, 1);
});
test("IDB upgrade copies legacy trainees once; imports commit atomically and retain recovery snapshot", async () => {
  Object.assign(globalThis, { indexedDB });
  const old = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("pocket-trainees", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("people", { keyPath: "id" });
      request.result.createObjectStore("payments", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = old.transaction("people", "readwrite");
  tx.objectStore("people").put(person);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  old.close();
  assert.equal((await listTrainees())[0].id, "t1");
  const local = fixture();
  await savePocketBookings(local.bookings);
  const before = await currentBackup(local.bookings, {
    locale: "fa",
    professionId: "tattoo_artist",
    onboarded: true,
  });
  const next = fixture();
  next.bookings[0].name = "بعد از ورود";
  next.trainees[0].sessionsDone = 9;
  await commitBackup(next, before);
  assert.equal((await listPocketBookings())[0].name, "بعد از ورود");
  assert.equal((await listTrainees())[0].sessionsDone, 9);
  assert.equal((await listTraineePayments()).length, 1);
  assert.equal((await readImportRecovery())?.bookings[0].name, row.name);
  const invalid = fixture();
  (invalid.trainees[0] as unknown as { id: unknown }).id = undefined;
  await assert.rejects(() => commitBackup(invalid, next));
  assert.equal((await listPocketBookings())[0].name, "بعد از ورود");
  assert.equal((await listTrainees())[0].sessionsDone, 9);
});
