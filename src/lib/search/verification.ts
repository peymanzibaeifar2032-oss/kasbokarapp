/** Separate from approval_status. Only assign a level when evidence exists. */
export const VERIFICATION_LEVELS = [
  "unverified",
  "basic",
  "contact_verified",
  "ownership_verified",
  "identity_verified",
] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export const VERIFICATION_WEIGHT: Record<VerificationLevel, number> = {
  unverified: 0,
  basic: 0.4,
  contact_verified: 0.7,
  ownership_verified: 0.85,
  identity_verified: 1,
};

/** Iran bounding box used as listing-location evidence, not identity proof. */
export const IRAN_LAT = { min: 24.5, max: 40.5 };
export const IRAN_LNG = { min: 43.5, max: 64 };

export type ListingEvidence = {
  name?: string | null;
  categoryId?: number | null;
  city?: string | null;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function inIran(lat: number, lng: number): boolean {
  return lat >= IRAN_LAT.min && lat <= IRAN_LAT.max && lng >= IRAN_LNG.min && lng <= IRAN_LNG.max;
}

/**
 * Phase 2 can only mint unverified | basic.
 * contact/ownership/identity stay reserved until SMS/docs/KYC adapters exist.
 */
export function deriveVerificationLevel(input: ListingEvidence): "unverified" | "basic" {
  const name = (input.name ?? "").trim();
  const city = (input.city ?? "").trim();
  const province = (input.province ?? "").trim();
  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  const cat = Number(input.categoryId);
  if (name.length < 2) return "unverified";
  if (!Number.isFinite(cat) || cat < 1) return "unverified";
  if (city.length < 2 || province.length < 2) return "unverified";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inIran(lat, lng)) return "unverified";
  return "basic";
}

const LOCKED: VerificationLevel[] = ["contact_verified", "ownership_verified", "identity_verified"];

export function nextVerificationLevel(
  current: VerificationLevel | null | undefined,
  derived: "unverified" | "basic",
): VerificationLevel {
  if (current && LOCKED.includes(current)) return current;
  return derived;
}

export function isLockedVerification(level: VerificationLevel): boolean {
  return LOCKED.includes(level);
}
