import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REGISTERED_MAP_PROVIDERS, providerOrder } from "./providers.ts";

describe("map providers", () => {
  it("keeps Esri as iran-primary adapter", () => {
    assert.equal(REGISTERED_MAP_PROVIDERS[0].id, "esri-street");
    assert.equal(REGISTERED_MAP_PROVIDERS[0].role, "iran-primary");
    assert.match(REGISTERED_MAP_PROVIDERS[0].template, /arcgisonline/);
  });

  it("lists international fallbacks without osm.org", () => {
    const fb = REGISTERED_MAP_PROVIDERS.filter((p) => p.role === "international-fallback");
    assert.ok(fb.length >= 1);
    for (const p of fb) assert.doesNotMatch(p.template, /openstreetmap\.org/);
  });

  it("can prefer a healthy cached provider without dropping the rest", () => {
    const ordered = providerOrder("osm-de");
    assert.equal(ordered[0].id, "osm-de");
    assert.ok(ordered.some((p) => p.id === "esri-street"));
  });
});
