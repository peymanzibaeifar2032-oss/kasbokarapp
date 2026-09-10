import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fillTileTemplate, isSafeTileTemplate, resolveMapTiles } from "./tiles.ts";

describe("map tiles", () => {
  it("rejects javascript and missing templates", () => {
    assert.equal(isSafeTileTemplate("javascript:alert(1)"), false);
    assert.equal(isSafeTileTemplate(""), false);
    assert.equal(isSafeTileTemplate("https://tiles.example.ir/{z}/{x}/{y}.png"), true);
    assert.equal(isSafeTileTemplate("/api/tiles/{z}/{x}/{y}"), true);
  });

  it("uses same-origin proxy when upstream is set", () => {
    const cfg = resolveMapTiles((k) =>
      k === "MAP_TILE_PROXY_UPSTREAM" ? "https://tiles.example.ir/{z}/{x}/{y}.png" : undefined,
    );
    assert.equal(cfg.proxy, true);
    assert.equal(cfg.url, "/api/tiles/{z}/{x}/{y}");
  });

  it("uses an Iranian or self-hosted URL without rewrite", () => {
    const cfg = resolveMapTiles((k) => {
      if (k === "MAP_TILE_URL") return "https://map.ir/shiveh/{z}/{x}/{y}.png";
      if (k === "MAP_TILE_ATTRIBUTION") return "Map.ir";
      return undefined;
    });
    assert.equal(cfg.proxy, false);
    assert.equal(cfg.url, "https://map.ir/shiveh/{z}/{x}/{y}.png");
    assert.equal(cfg.attribution, "Map.ir");
  });

  it("falls back to public OSM when nothing is configured (preview / Netlify backup)", () => {
    const cfg = resolveMapTiles(() => undefined);
    assert.match(cfg.url, /openstreetmap\.org/);
    assert.equal(cfg.proxy, false);
  });

  it("fills z/x/y", () => {
    assert.equal(
      fillTileTemplate("https://t.example/{z}/{x}/{y}.png", 6, 40, 25),
      "https://t.example/6/40/25.png",
    );
  });
});
