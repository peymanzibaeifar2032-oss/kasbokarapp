import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { projectRoot } from "./with-app-env.mjs";

const root = projectRoot();
const sql = readFileSync(join(root, "migrations/0016_resources.sql"), "utf8");
const health = readFileSync(join(root, "src/routes/api/health.ts"), "utf8");
const writes = readFileSync(join(root, "src/lib/server/writes.ts"), "utf8");
const resources = readFileSync(join(root, "src/lib/calendar/resources.ts"), "utf8");

test("0016 kinds are staff/chair/room/equipment with capacity frozen at 1", () => {
  assert.match(sql, /check \(kind in \('staff', 'chair', 'room', 'equipment'\)\)/);
  assert.match(sql, /capacity int not null default 1/);
  assert.match(sql, /check \(capacity = 1\)/);
  assert.doesNotMatch(sql, /'other'/);
});

test("0016 defers resource_service_map and adds resource schedules", () => {
  assert.doesNotMatch(sql, /resource_service_map/);
  assert.match(sql, /create table if not exists resource_work_hours/);
  assert.match(sql, /create table if not exists resource_special_hours/);
  assert.match(sql, /references business_resources \(id\) on delete cascade/);
});

test("0016 maps staff_id only onto same-business resources and fail-closes FKs", () => {
  assert.match(sql, /and exists \(\s*select 1 from business_resources r\s*where r\.id = k\.staff_id\s*and r\.business_id = k\.business_id/s);
  assert.match(sql, /raise exception '0016 resource FK refused/);
  assert.doesNotMatch(sql, /exception when others then/);
  assert.doesNotMatch(sql, /skip bookings_resource_fk/);
  assert.match(sql, /alter table bookings add constraint bookings_resource_fk/);
  assert.match(sql, /alter table booking_holds add constraint booking_holds_resource_fk/);
});

test("0016 occupancy is wildcard NULL with symmetric hold/booking triggers", () => {
  assert.match(sql, /NULL resource_id = GLOBAL\/WILDCARD occupancy, never "Any Staff"/);
  assert.match(sql, /create or replace function occupancy_resources_conflict/);
  assert.match(sql, /create or replace function booking_holds_prevent_overlap/);
  assert.match(sql, /create trigger booking_holds_prevent_overlap_trg/);
  const forUpdate = sql.match(/perform 1 from businesses where id = new\.business_id for update/g) || [];
  assert.equal(forUpdate.length, 2);
});

test("health tracks resource schedule tables, not resource_service_map", () => {
  assert.doesNotMatch(health, /resource_service_map/);
  assert.match(health, /"resource_work_hours"/);
  assert.match(health, /"resource_special_hours"/);
  assert.match(health, /"business_resources"/);
  assert.match(health, /0016_resources\.sql/);
});

test("runtime never writes Any Staff as NULL and never uses resource_service_map", () => {
  assert.doesNotMatch(writes, /resource_service_map/);
  assert.match(writes, /persistableResourceId/);
  assert.match(writes, /assignResourceAtIso/);
  assert.match(writes, /resolveRescheduleResource/);
  assert.match(writes, /"chair"/);
  assert.match(resources, /staff", "chair", "room", "equipment/);
});
