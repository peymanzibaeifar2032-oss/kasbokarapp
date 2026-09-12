import {
  hasWhenResidue,
  isIntentDebrisText,
  queryHasTodayAvailability,
  type ParsedQuery,
} from "./parse-query.ts";

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
 * WHAT is the requested service/category. Leftover time/place words never win.
 * Named remainder (e.g. ماه‌رخ) is used only when no category alias matched.
 */
export function whatChipValue(parsed: ParsedQuery): string {
  const term = (parsed.categoryTerm || "").trim();
  if (term) return term;
  const rem = (parsed.remainder || "").trim();
  if (!rem || isIntentDebrisText(rem) || hasWhenResidue(rem)) return "";
  return rem;
}

/** Leftover availability/time text must never be shown as WHAT. */
export function looksLikeWhenText(raw: string | undefined | null): boolean {
  const t = (raw ?? "").trim();
  if (!t) return false;
  return isIntentDebrisText(t) || hasWhenResidue(t);
}

/**
 * Map a parsed query onto list filters and visible intent chips.
 * Chips are omitted unless the value is actually known:
 * - where/nearMe only after a real origin
 * - when/openNow only for work-hours
 * - when/freeToday only when the parser saw an explicit today-availability phrase
 * - what is the service/category, never a leftover time/location phrase
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
  let what = whatChipValue(parsed);
  if (looksLikeWhenText(what)) what = (parsed.categoryTerm || "").trim();
  if (what) chips.push({ key: "what", value: what });
  else if (parsed.categoryId) chips.push({ key: "what", value: String(parsed.categoryId) });

  if (parsed.city) chips.push({ key: "where", value: parsed.city });
  else if (parsed.nearMe && pinned) chips.push({ key: "where", value: "nearMe" });

  const openNow = parsed.openNow;
  const freeToday = Boolean(parsed.freeToday) || queryHasTodayAvailability(parsed.original);
  if (openNow) chips.push({ key: "when", value: "openNow" });
  if (freeToday) chips.push({ key: "when", value: "freeToday" });

  return {
    categoryId: parsed.categoryId,
    city,
    province,
    openNow,
    freeToday,
    needsLocation,
    sortDistance: Boolean(parsed.nearMe && pinned),
    omitDefaultPlace,
    chips,
  };
}
