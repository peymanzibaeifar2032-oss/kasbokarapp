import { isIranMobile, normalizeIranPhone } from "../format.ts";
import type { PriceItem, WorkHour } from "../types.ts";
import { inIran } from "./verification.ts";

export type CompletenessField =
  | "name"
  | "category"
  | "phone"
  | "place"
  | "address"
  | "coords"
  | "hours"
  | "prices"
  | "description";

/** Weights sum to 100. Completeness is a ranking signal only — never a visibility gate. */
export const COMPLETENESS_WEIGHTS: Record<CompletenessField, number> = {
  name: 10,
  category: 10,
  phone: 15,
  place: 10,
  address: 10,
  coords: 10,
  hours: 10,
  prices: 15,
  description: 10,
};

export type CompletenessInput = {
  name?: string | null;
  categoryId?: number | null;
  phone?: string | null;
  city?: string | null;
  province?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  prices?: PriceItem[] | null;
  workHours?: WorkHour[] | null;
};

export type CompletenessResult = {
  score: number;
  filled: CompletenessField[];
  missing: CompletenessField[];
};

function hasPhone(raw: string | null | undefined): boolean {
  if (!raw) return false;
  if (isIranMobile(raw)) return true;
  const n = normalizeIranPhone(raw);
  return /^0\d{10}$/.test(n);
}

function checks(b: CompletenessInput): Record<CompletenessField, boolean> {
  const lat = Number(b.latitude);
  const lng = Number(b.longitude);
  return {
    name: (b.name ?? "").trim().length >= 2,
    category: Number(b.categoryId) > 0,
    phone: hasPhone(b.phone),
    place: (b.city ?? "").trim().length >= 2 && (b.province ?? "").trim().length >= 2,
    address: (b.address ?? "").trim().length >= 8,
    coords: Number.isFinite(lat) && Number.isFinite(lng) && inIran(lat, lng),
    hours: Boolean(b.workHours?.some((h) => !h.closed && h.open && h.close)),
    prices: Boolean(b.prices?.some((p) => (p.title ?? "").trim().length > 0)),
    description: (b.description ?? "").trim().length >= 20,
  };
}

export function profileCompleteness(b: CompletenessInput): CompletenessResult {
  const got = checks(b);
  const filled: CompletenessField[] = [];
  const missing: CompletenessField[] = [];
  let score = 0;
  (Object.keys(COMPLETENESS_WEIGHTS) as CompletenessField[]).forEach((key) => {
    if (got[key]) {
      filled.push(key);
      score += COMPLETENESS_WEIGHTS[key];
    } else missing.push(key);
  });
  return { score, filled, missing };
}
