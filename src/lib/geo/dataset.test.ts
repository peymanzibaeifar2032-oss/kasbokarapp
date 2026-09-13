import assert from "node:assert/strict";
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { describe, it } from "node:test";
import { createGunzip } from "node:zlib";
import { geoCsvPath } from "../../../scripts/seed-geo.mjs";
import { compactFa, placeMatchesQuery } from "./places.ts";

describe("official iran geo dataset", () => {
  it("covers 31 provinces with no orphans", async () => {
    const path = geoCsvPath();
    assert.equal(existsSync(path), true);
    const counts: Record<string, number> = {};
    const ids = new Set<string>();
    const parents: { parent: string }[] = [];
    const names: { name: string; type: string }[] = [];
    const rl = createInterface({
      input: createReadStream(path).pipe(createGunzip()),
      crlfDelay: Infinity,
    });
    let header: string[] | null = null;
    for await (const line of rl) {
      if (!line.trim()) continue;
      const cols = line.split(",");
      if (!header) {
        header = cols;
        continue;
      }
      const row = Object.fromEntries(header.map((k, i) => [k, cols[i] ?? ""]));
      counts[row.type] = (counts[row.type] ?? 0) + 1;
      ids.add(row.id);
      names.push({ name: row.normalized_name, type: row.type });
      if (row.type !== "province") parents.push({ parent: row.parent_id });
    }
    assert.equal(counts.province, 31);
    assert.equal(counts.county > 400, true);
    assert.equal(counts.city > 1200, true);
    assert.equal(counts.village > 50000, true);
    const orphans = parents.filter((p) => !p.parent || !ids.has(p.parent));
    assert.equal(orphans.length, 0);
    assert.equal(
      names.some((n) => n.type === "county" && placeMatchesQuery(n.name, "اسلام‌آباد غرب")),
      true,
    );
    assert.equal(names.some((n) => n.type === "county" && n.name === "پاوه"), true);
    assert.equal(names.some((n) => n.type === "county" && n.name === "سنقر"), true);
    assert.equal(compactFa("اسلام آباد غرب") === compactFa("اسلام آبادغرب"), true);
  });
});
