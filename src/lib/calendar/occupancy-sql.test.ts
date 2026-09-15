import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { ACTIVE_OCCUPANCY_SQL, HOLDS_OCCUPANCY_SELECT, OCCUPANCY_SELECT } from "../server/db-map.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const MIGRATION = readFileSync(join(root, "migrations/0016_resources.sql"), "utf8");

const STUB = `
create table businesses (id text primary key);
create table bookings (
  id text primary key,
  business_id text not null,
  slot_start timestamptz not null,
  slot_end timestamptz,
  kind text not null default 'booking',
  status text not null default 'requested',
  buffer_before int not null default 0,
  buffer_after int not null default 0,
  resource_id text,
  staff_id text
);
create table booking_holds (
  id text primary key,
  business_id text not null references businesses (id) on delete cascade,
  user_id text,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create or replace function booking_occ_range(
  slot_start timestamptz, slot_end timestamptz, buffer_before int, buffer_after int
) returns tstzrange language sql immutable as $$
  select tstzrange(
    slot_start - make_interval(mins => greatest(0, coalesce(buffer_before, 0))),
    slot_end + make_interval(mins => greatest(0, coalesce(buffer_after, 0))),
    '[)'
  );
$$;
`;

const START = "2026-09-20T05:30:00+00:00";
const END = "2026-09-20T06:30:00+00:00";

async function boot(seed = "") {
  const db = new PGlite();
  await db.exec(STUB);
  if (seed) await db.exec(seed);
  await db.exec(MIGRATION);
  return db;
}

async function expectOverlap(fn: () => Promise<unknown>) {
  await assert.rejects(fn, (err: unknown) => {
    const rec = err as { code?: string; message?: string };
    return rec.code === "23P01" || /booking overlap/i.test(rec.message || "");
  });
}

describe("0016 occupancy SQL authority", () => {
  it("R vs R rejected; R vs S parallel; NULL conflicts with everything", async () => {
    const db = await boot(`
      insert into businesses (id) values ('b1');
    `);
    await db.query(`insert into business_resources (id, business_id, kind, name) values ('R','b1','staff','R'), ('S','b1','staff','S')`);
    await db.query(
      `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
       values ('k1','b1',$1,$2,'booking','confirmed','R')`,
      [START, END],
    );
    await expectOverlap(() =>
      db.query(
        `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
         values ('k2','b1',$1,$2,'booking','confirmed','R')`,
        [START, END],
      ),
    );
    await db.query(
      `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
       values ('k3','b1',$1,$2,'booking','confirmed','S')`,
      [START, END],
    );
    await expectOverlap(() =>
      db.query(
        `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
         values ('k4','b1',$1,$2,'booking','confirmed',null)`,
        [START, END],
      ),
    );
    const matrix = await db.query<{ v: boolean }>(
      `select occupancy_resources_conflict(true, null, 'R') as v
       union all select occupancy_resources_conflict(true, 'R', null)
       union all select occupancy_resources_conflict(true, null, null)
       union all select occupancy_resources_conflict(true, 'R', 'R')
       union all select occupancy_resources_conflict(true, 'R', 'S')
       union all select occupancy_resources_conflict(false, 'R', 'S')`,
    );
    assert.deepEqual(matrix.rows.map((r) => r.v), [true, true, true, true, false, true]);
    await db.close();
  });

  it("zero-resource legacy is business-wide", async () => {
    const db = await boot(`insert into businesses (id) values ('b0');`);
    await db.query(
      `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
       values ('k1','b0',$1,$2,'booking','confirmed',null)`,
      [START, END],
    );
    await expectOverlap(() =>
      db.query(
        `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
         values ('k2','b0',$1,$2,'booking','confirmed',null)`,
        [START, END],
      ),
    );
    await db.close();
  });

  it("booking vs live hold and hold vs live booking reject; hold R vs S accepted; expired hold ignored", async () => {
    const db = await boot(`insert into businesses (id) values ('b1');`);
    await db.query(
      `insert into business_resources (id, business_id, kind, name)
       values ('R','b1','staff','R'), ('S','b1','staff','S')`,
    );
    await db.query(
      `insert into booking_holds (id, business_id, slot_start, slot_end, expires_at, resource_id)
       values ('h1','b1',$1,$2, now() + interval '10 minutes','R')`,
      [START, END],
    );
    await expectOverlap(() =>
      db.query(
        `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
         values ('k1','b1',$1,$2,'booking','confirmed','R')`,
        [START, END],
      ),
    );
    await db.query(
      `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
       values ('kS','b1',$1,$2,'booking','confirmed','S')`,
      [START, END],
    );
    await db.query(
      `insert into booking_holds (id, business_id, slot_start, slot_end, expires_at, resource_id)
       values ('hS','b1',$1,$2, now() + interval '10 minutes','S')`,
      ["2026-09-20T07:30:00+00:00", "2026-09-20T08:30:00+00:00"],
    );
    await db.query(
      `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
       values ('kLive','b1',$1,$2,'booking','confirmed','R')`,
      ["2026-09-20T07:30:00+00:00", "2026-09-20T08:30:00+00:00"],
    );
    await expectOverlap(() =>
      db.query(
        `insert into booking_holds (id, business_id, slot_start, slot_end, expires_at, resource_id)
         values ('hLive','b1',$1,$2, now() + interval '10 minutes','R')`,
        ["2026-09-20T07:30:00+00:00", "2026-09-20T08:30:00+00:00"],
      ),
    );
    await db.query(
      `insert into booking_holds (id, business_id, slot_start, slot_end, expires_at, resource_id)
       values ('hExp','b1',$1,$2, now() - interval '1 minute','R')`,
      ["2026-09-21T05:30:00+00:00", "2026-09-21T06:30:00+00:00"],
    );
    await db.query(
      `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
       values ('kExp','b1',$1,$2,'booking','confirmed','R')`,
      ["2026-09-21T05:30:00+00:00", "2026-09-21T06:30:00+00:00"],
    );
    await db.close();
  });

  it("concurrent same-resource writers serialize to one winner", async () => {
    const db = await boot(`insert into businesses (id) values ('b1');`);
    await db.query(`insert into business_resources (id, business_id, kind, name) values ('R','b1','staff','R')`);
    const results = await Promise.allSettled([
      db.query(
        `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
         values ('c1','b1',$1,$2,'booking','confirmed','R')`,
        [START, END],
      ),
      db.query(
        `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
         values ('c2','b1',$1,$2,'booking','confirmed','R')`,
        [START, END],
      ),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const bad = results.filter((r) => r.status === "rejected").length;
    assert.equal(ok, 1);
    assert.equal(bad, 1);
    await db.close();
  });

  it("concurrent booking/hold and hold/booking races reject one writer", async () => {
    const db = await boot(`insert into businesses (id) values ('b1');`);
    await db.query(`insert into business_resources (id, business_id, kind, name) values ('R','b1','staff','R')`);
    const bookingHold = await Promise.allSettled([
      db.query(
        `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
         values ('bh1','b1',$1,$2,'booking','confirmed','R')`,
        [START, END],
      ),
      db.query(
        `insert into booking_holds (id, business_id, slot_start, slot_end, expires_at, resource_id)
         values ('bh2','b1',$1,$2, now() + interval '10 minutes','R')`,
        [START, END],
      ),
    ]);
    assert.equal(bookingHold.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(bookingHold.filter((r) => r.status === "rejected").length, 1);

    const later = "2026-09-22T05:30:00+00:00";
    const laterEnd = "2026-09-22T06:30:00+00:00";
    const holdBooking = await Promise.allSettled([
      db.query(
        `insert into booking_holds (id, business_id, slot_start, slot_end, expires_at, resource_id)
         values ('hb1','b1',$1,$2, now() + interval '10 minutes','R')`,
        [later, laterEnd],
      ),
      db.query(
        `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
         values ('hb2','b1',$1,$2,'booking','confirmed','R')`,
        [later, laterEnd],
      ),
    ]);
    assert.equal(holdBooking.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(holdBooking.filter((r) => r.status === "rejected").length, 1);
    await db.close();
  });

  it("kinds/capacity checks and FKs exist after a clean apply", async () => {
    const db = await boot(`insert into businesses (id) values ('b1');`);
    await db.query(
      `insert into business_resources (id, business_id, kind, name, capacity)
       values ('R','b1','chair','Chair',1)`,
    );
    await assert.rejects(() =>
      db.query(`insert into business_resources (id, business_id, kind, name) values ('X','b1','other','X')`),
    );
    await assert.rejects(() =>
      db.query(
        `insert into business_resources (id, business_id, kind, name, capacity)
         values ('Y','b1','staff','Y',2)`,
      ),
    );
    const fks = await db.query<{ conname: string }>(
      `select conname from pg_constraint
        where conname in ('bookings_resource_fk','booking_holds_resource_fk')
        order by conname`,
    );
    assert.deepEqual(fks.rows.map((r) => r.conname), ["booking_holds_resource_fk", "bookings_resource_fk"]);
    await assert.rejects(() =>
      db.query(
        `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
         values ('bad','b1',$1,$2,'booking','confirmed','ghost')`,
        [START, END],
      ),
    );
    await db.close();
  });

  it("legacy staff_id copies only when a same-business resource exists; orphans fail closed", async () => {
    const db = await boot(`insert into businesses (id) values ('b1'), ('b2');`);
    await db.query(
      `insert into business_resources (id, business_id, kind, name) values ('R','b1','staff','R'), ('T','b2','staff','T')`,
    );
    await db.exec(`
      insert into bookings (id, business_id, slot_start, slot_end, kind, status, staff_id)
      values
        ('k1','b1','2026-09-20T05:30:00+00:00','2026-09-20T06:30:00+00:00','booking','confirmed','R'),
        ('k2','b1','2026-09-20T07:30:00+00:00','2026-09-20T08:30:00+00:00','booking','confirmed','ghost'),
        ('k3','b1','2026-09-20T09:30:00+00:00','2026-09-20T10:30:00+00:00','booking','confirmed','T');
    `);
    await db.exec(`
      update bookings k
         set resource_id = k.staff_id
       where (k.resource_id is null or btrim(k.resource_id) = '')
         and k.staff_id is not null and btrim(k.staff_id) <> ''
         and exists (
           select 1 from business_resources r
            where r.id = k.staff_id
              and r.business_id = k.business_id
         );
    `);
    const rows = await db.query<{ id: string; resource_id: string | null }>(
      `select id, resource_id from bookings where id in ('k1','k2','k3') order by id`,
    );
    const byId = Object.fromEntries(rows.rows.map((r) => [r.id, r.resource_id]));
    assert.equal(byId.k1, "R");
    assert.equal(byId.k2, null);
    assert.equal(byId.k3, null);
    await db.close();

    await assert.rejects(async () => {
      const bad = new PGlite();
      await bad.exec(STUB);
      await bad.exec(`
        insert into businesses (id) values ('b1');
        insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id)
        values ('bad','b1','${START}','${END}','booking','confirmed','ghost');
      `);
      await bad.exec(MIGRATION);
    }, /0016 resource FK refused|orphan_bookings/);
  });

  it("home occupancy union has matching hold columns", async () => {
    const db = await boot(`insert into businesses (id) values ('b1');`);
    const holdStart = "2026-09-20T07:30:00+00:00";
    const holdEnd = "2026-09-20T08:30:00+00:00";
    await db.query(
      `insert into bookings (id, business_id, slot_start, slot_end, kind, status, resource_id, buffer_before, buffer_after)
       values ('k1','b1',$1,$2,'booking','confirmed',null,0,0)`,
      [START, END],
    );
    await db.query(
      `insert into booking_holds (id, business_id, slot_start, slot_end, expires_at, resource_id)
       values ('h1','b1',$1,$2, now() + interval '10 minutes', null)`,
      [holdStart, holdEnd],
    );
    const rows = await db.query<{
      business_id: string;
      slot_start: string;
      slot_end: string;
      resource_id: string | null;
    }>(
      `select ${OCCUPANCY_SELECT} from bookings
        where business_id = any($1::text[])
          and ${ACTIVE_OCCUPANCY_SQL}
          and slot_end > now()
          and slot_start < now() + interval '8 days'
        union all
        select ${HOLDS_OCCUPANCY_SELECT} from booking_holds
         where business_id = any($1::text[])
           and expires_at > now()`,
      [["b1"]],
    );
    assert.equal(rows.rows.length, 2);
    assert.ok(rows.rows.every((r) => r.business_id === "b1" && r.slot_start && r.slot_end && "resource_id" in r));
    await db.close();
  });
});
