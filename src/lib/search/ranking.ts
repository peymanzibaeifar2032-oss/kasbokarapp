import { haversineKm } from "../format.ts";
import { profileCompleteness } from "./completeness.ts";
import { VERIFICATION_WEIGHT, type VerificationLevel } from "./verification.ts";
import type { Business } from "../types.ts";

/** Prior so 5.0/1 review cannot beat 4.8/80. Documented, deterministic. */
export const RATING_PRIOR_MEAN = 4.2;
export const RATING_PRIOR_N = 8;

/**
 * Review signal uses every row in `reviews`. Phase 2 has no verified-visit
 * flag — do not invent one. Ranking never bypasses VISIBLE_SQL.
 */
export function bayesianRating(avg: number, count: number): number {
  const n = Math.max(0, count);
  const a = Number.isFinite(avg) ? avg : 0;
  return (a * n + RATING_PRIOR_MEAN * RATING_PRIOR_N) / (n + RATING_PRIOR_N);
}

export type RankInput = {
  id: string;
  ratingAvg: number;
  ratingCount: number;
  openNow: boolean;
  verificationLevel: VerificationLevel;
  completenessScore: number;
  rankingFreshAt: string | null;
  createdAt: string;
  latitude: number;
  longitude: number;
};

export type RankBreakdown = {
  id: string;
  total: number;
  bayes: number;
  open: number;
  verification: number;
  reviews: number;
  completeness: number;
  freshness: number;
  distance: number;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function ageDays(iso: string | null, now: Date): number {
  if (!iso) return 999;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, (now.getTime() - t) / 86400000);
}

export function rankBreakdown(
  b: RankInput,
  opts: { now?: Date; origin?: { lat: number; lng: number } | null } = {},
): RankBreakdown {
  const now = opts.now ?? new Date();
  const bayes = bayesianRating(b.ratingAvg, b.ratingCount);
  const open = b.openNow ? 1 : 0;
  const verification = VERIFICATION_WEIGHT[b.verificationLevel] ?? 0;
  const reviews = Math.log(1 + b.ratingCount) / Math.log(1 + 80);
  const completeness = clamp01(b.completenessScore / 100);
  const freshIso = b.rankingFreshAt || b.createdAt;
  const freshness = clamp01(1 - ageDays(freshIso, now) / 30);
  let distance = 0;
  if (opts.origin) {
    const km = haversineKm(opts.origin, { lat: b.latitude, lng: b.longitude });
    distance = clamp01(1 - km / 10);
  }
  const total =
    40 * (bayes / 5) +
    18 * open +
    12 * verification +
    10 * clamp01(reviews) +
    10 * completeness +
    6 * freshness +
    4 * distance;
  return {
    id: b.id,
    total,
    bayes,
    open,
    verification,
    reviews: clamp01(reviews),
    completeness,
    freshness,
    distance,
  };
}

export function compareRanked(a: RankBreakdown, b: RankBreakdown): number {
  return (
    b.total - a.total ||
    b.bayes - a.bayes ||
    b.reviews - a.reviews ||
    b.completeness - a.completeness ||
    a.id.localeCompare(b.id)
  );
}

export function toRankInput(
  b: Pick<
    Business,
    | "id"
    | "ratingAvg"
    | "ratingCount"
    | "workHours"
    | "createdAt"
    | "latitude"
    | "longitude"
    | "name"
    | "categoryId"
    | "phone"
    | "city"
    | "province"
    | "address"
    | "description"
    | "prices"
  > & { verificationLevel?: VerificationLevel; rankingFreshAt?: string | null; openNow?: boolean },
): RankInput {
  const complete = profileCompleteness(b);
  return {
    id: b.id,
    ratingAvg: b.ratingAvg,
    ratingCount: b.ratingCount,
    openNow: Boolean(b.openNow),
    verificationLevel: b.verificationLevel ?? "unverified",
    completenessScore: complete.score,
    rankingFreshAt: b.rankingFreshAt ?? null,
    createdAt: b.createdAt,
    latitude: b.latitude,
    longitude: b.longitude,
  };
}

export function sortByRelevance<T extends Parameters<typeof toRankInput>[0]>(
  rows: T[],
  opts: { now?: Date; origin?: { lat: number; lng: number } | null } = {},
): T[] {
  const scored = rows.map((row) => ({ row, br: rankBreakdown(toRankInput(row), opts) }));
  scored.sort((a, b) => compareRanked(a.br, b.br));
  return scored.map((s) => s.row);
}

/** Meaningful events that may bump ranking_fresh_at. Not every profile save. */
export function shouldBumpRankingFresh(
  before: { categoryId: number; priceCount: number },
  after: { categoryId: number; priceCount: number },
) {
  if (before.categoryId !== after.categoryId) return true;
  if (before.priceCount === 0 && after.priceCount > 0) return true;
  return false;
}
