import assert from "node:assert/strict";
import test from "node:test";
import { visibilityOf } from "./db-map.ts";

function row(partial: {
  approval_status?: string;
  is_active?: boolean;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
}) {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  return {
    id: "x",
    owner_id: "o",
    name: "n",
    job_title: null,
    phone: null,
    province: "تهران",
    city: "تهران",
    address: null,
    latitude: 35,
    longitude: 51,
    category_id: 1,
    category_name: "c",
    category_slug: "c",
    category_icon: "store",
    description: null,
    instagram: null,
    whatsapp: null,
    website: null,
    work_hours: "[]",
    slot_minutes: 60,
    prices: "[]",
    offer_text: null,
    approval_status: "approved",
    is_active: true,
    trial_ends_at: future,
    subscription_ends_at: null,
    created_at: past,
    rating_avg: 0,
    rating_count: 0,
    ...partial,
  };
}

test("expired trial is not publicly visible", () => {
  assert.equal(
    visibilityOf(
      row({
        trial_ends_at: new Date(Date.now() - 1000).toISOString(),
        subscription_ends_at: null,
      }),
    ),
    "expired",
  );
});

test("active trial is visible", () => {
  assert.equal(visibilityOf(row({})), "trial");
});

test("paid window beats expired trial", () => {
  assert.equal(
    visibilityOf(
      row({
        trial_ends_at: new Date(Date.now() - 1000).toISOString(),
        subscription_ends_at: new Date(Date.now() + 86400000).toISOString(),
      }),
    ),
    "subscribed",
  );
});

test("browser cannot force visibility: pending stays pending", () => {
  assert.equal(visibilityOf(row({ approval_status: "pending" })), "pending");
  assert.equal(visibilityOf(row({ is_active: false })), "pending");
});
