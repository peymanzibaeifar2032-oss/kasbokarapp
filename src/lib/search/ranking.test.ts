import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bayesianRating, compareRanked, rankBreakdown, shouldBumpRankingFresh } from "./ranking.ts";
import type { RankInput } from "./ranking.ts";

function biz(partial: Partial<RankInput> & { id: string }): RankInput {
  return {
    ratingAvg: 0,
    ratingCount: 0,
    openNow: false,
    verificationLevel: "unverified",
    completenessScore: 50,
    rankingFreshAt: "2020-01-01T00:00:00.000Z",
    createdAt: "2020-01-01T00:00:00.000Z",
    latitude: 34.32,
    longitude: 47.07,
    ...partial,
  };
}

describe("ranking", () => {
  it("does not let 5.0 from one review beat 4.8 from 80", () => {
    const a = bayesianRating(5, 1);
    const b = bayesianRating(4.8, 80);
    assert.ok(b > a, `${b} should be > ${a}`);
    const ra = rankBreakdown(biz({ id: "a", ratingAvg: 5, ratingCount: 1 }));
    const rb = rankBreakdown(biz({ id: "b", ratingAvg: 4.8, ratingCount: 80 }));
    assert.ok(compareRanked(ra, rb) > 0);
  });

  it("is deterministic for ties via id", () => {
    const x = rankBreakdown(biz({ id: "aa" }));
    const y = rankBreakdown(biz({ id: "bb" }));
    assert.equal(x.total, y.total);
    assert.ok(compareRanked(x, y) < 0);
  });

  it("does not treat trivial edits as freshness", () => {
    assert.equal(shouldBumpRankingFresh({ categoryId: 1, priceCount: 1 }, { categoryId: 1, priceCount: 1 }), false);
    assert.equal(shouldBumpRankingFresh({ categoryId: 1, priceCount: 0 }, { categoryId: 1, priceCount: 2 }), true);
    assert.equal(shouldBumpRankingFresh({ categoryId: 1, priceCount: 1 }, { categoryId: 8, priceCount: 1 }), true);
  });

  it("boosts open shops without dropping closed ones", () => {
    const open = rankBreakdown(biz({ id: "open", openNow: true }));
    const closed = rankBreakdown(biz({ id: "closed", openNow: false }));
    assert.ok(open.total > closed.total);
    assert.equal(closed.total > 0, true);
  });

  it("applies distance only when origin is present", () => {
    const none = rankBreakdown(biz({ id: "a" }));
    assert.equal(none.distance, 0);
    const origin = { lat: 34.32, lng: 47.07 };
    const near = rankBreakdown(biz({ id: "n", latitude: 34.32, longitude: 47.07 }), { origin });
    const far = rankBreakdown(biz({ id: "f", latitude: 35.7, longitude: 51.4 }), { origin });
    assert.ok(near.distance > far.distance);
  });

  it("does not let completeness zero a closed unverified listing", () => {
    const sparse = rankBreakdown(biz({ id: "s", completenessScore: 0, openNow: false }));
    assert.ok(sparse.total > 0);
  });
});
