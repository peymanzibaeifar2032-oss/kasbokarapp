import { isAvailDebrisText, type ParsedQuery } from "./parse-query.ts";

export type GeoOrigin = { lat: number; lng: number };

export type ApplyIntentInput = {
  parsed: ParsedQuery;
  defaultCity?: string | null;
  defaultProvince?: string | null;
  origin?: GeoOrigin | null;
  /** User chose the city picker instead of (or after denying) GPS. */
  cityFallback?: boolean;
};

export type IntentChip = {
  key: "what" | "where" | "when";
  /** Token `nearMe` / `openNow` / `freeToday`, or a concrete Persian value. */
  value: string;
};

export type AppliedIntent = {
  categoryId?: number;
  city: string | null;
  province: string | null;
  openNow: boolean;
  freeToday: boolean;
  needsLocation: boolean;
  sortDistance: boolean;
  omitDefaultPlace: boolean;
  chips: IntentChip[];
};

function hasOrigin(origin: GeoOrigin | null | undefined): origin is GeoOrigin {
  return Boolean(origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng));
}

function placeOrNull(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  return v.length ? v : null;
}

/**
 * Map a parsed query onto list filters and visible intent chips.
 * Chips are omitted unless the value is actually known:
 * - where/nearMe only after a real origin
 * - when/openNow only for work-hours
 * - when/freeToday only when the parser saw a real availability phrase
 * - what never shows leftover «وقت خالی دارد» debris
 */
export function applySearchIntent(input: ApplyIntentInput): AppliedIntent {
  const { parsed, origin, cityFallback } = input;
  const pinned = hasOrigin(origin);
  const needsLocation = Boolean(parsed.nearMe && !pinned && !cityFallback);
  const omitDefaultPlace = Boolean(parsed.nearMe && pinned && !parsed.city);

  let city: string | null;
  let province: string | null;
  if (parsed.city) {
    city = parsed.city;
    province = placeOrNull(parsed.province);
  } else if (omitDefaultPlace) {
    city = null;
    province = null;
  } else {
    city = placeOrNull(input.defaultCity);
    province = placeOrNull(input.defaultProvince);
  }

  const chips: IntentChip[] = [];
  const remainder = isAvailDebrisText(parsed.remainder) ? "" : (parsed.remainder || "").trim();
  const what = (remainder || parsed.categoryTerm || "").trim();
  if (what) chips.push({ key: "what", value: what });
  else if (parsed.categoryId) chips.push({ key: "what", value: String(parsed.categoryId) });

  if (parsed.city) chips.push({ key: "where", value: parsed.city });
  else if (parsed.nearMe && pinned) chips.push({ key: "where", value: "nearMe" });

  if (parsed.openNow) chips.push({ key: "when", value: "openNow" });
  if (parsed.freeToday) chips.push({ key: "when", value: "freeToday" });

  return {
    categoryId: parsed.categoryId,
    city,
    province,
    openNow: parsed.openNow,
    freeToday: parsed.freeToday,
    needsLocation,
    sortDistance: Boolean(parsed.nearMe && pinned),
    omitDefaultPlace,
    chips,
  };
}
