import { buildSlotGrid, buildSlots, type AvailabilityOptions, type SlotOption } from "../hours.ts";
import type { Business } from "@/lib/types";

export type ResourceKind = "staff" | "room" | "equipment" | "other";

export type BusinessResource = {
  id: string;
  businessId: string;
  kind: ResourceKind;
  name: string;
  color: string | null;
  active: boolean;
  sortOrder: number;
  serviceTitles?: string[];
};

export type OccupancyHit = {
  start: string;
  end: string;
  resourceId?: string | null;
};

export function hasActiveResources(resources: { active?: boolean }[] | null | undefined) {
  return Boolean(resources?.some((r) => r.active !== false));
}

/** Wildcard NULL occupies every resource. Legacy (no resources) is business-wide. */
export function resourcesConflict(
  a: string | null | undefined,
  b: string | null | undefined,
  hasResources: boolean,
): boolean {
  if (!hasResources) return true;
  if (!a || !b) return true;
  return a === b;
}

export function occupancyHitsResource(
  hit: OccupancyHit,
  resourceId: string | null | undefined,
  hasResources: boolean,
): boolean {
  return resourcesConflict(hit.resourceId, resourceId, hasResources);
}

export function filterOccupancy(
  hits: OccupancyHit[],
  resourceId: string | null | undefined,
  hasResources: boolean,
): OccupancyHit[] {
  return hits.filter((h) => occupancyHitsResource(h, resourceId, hasResources));
}

/** If the service is mapped to some staff, only those; otherwise every active resource. */
export function eligibleResources(
  resources: BusinessResource[],
  serviceTitle?: string | null,
): BusinessResource[] {
  const active = resources.filter((r) => r.active !== false);
  const title = serviceTitle?.trim();
  if (!title) return active;
  const mapped = active.filter((r) => (r.serviceTitles ?? []).includes(title));
  return mapped.length ? mapped : active;
}

/** Any Staff = UNION of free slot isos across staff. */
export function unionFreeIsos(perResourceFreeIsos: string[][]): string[] {
  const set = new Set<string>();
  for (const list of perResourceFreeIsos) {
    for (const iso of list) set.add(iso);
  }
  return [...set].sort();
}

export function pickResourceForSlot(
  resources: { id: string; active?: boolean }[],
  iso: string,
  isFree: (resourceId: string, iso: string) => boolean,
): string | null {
  for (const r of resources) {
    if (r.active === false) continue;
    if (isFree(r.id, iso)) return r.id;
  }
  return null;
}

export function slotsForResource(
  business: Pick<Business, "workHours" | "slotMinutes">,
  hits: OccupancyHit[],
  resourceId: string | null | undefined,
  hasResources: boolean,
  days: number,
  now: Date,
  durationMinutes: number | undefined,
  options: AvailabilityOptions = {},
  includeOccupied = false,
): SlotOption[] {
  const busy = filterOccupancy(hits, resourceId, hasResources);
  return includeOccupied
    ? buildSlotGrid(business, busy, days, now, durationMinutes, { ...options, includeOccupied: true })
    : buildSlots(business, busy, days, now, durationMinutes, options);
}

export function anyStaffGrid(
  business: Pick<Business, "workHours" | "slotMinutes">,
  hits: OccupancyHit[],
  resources: BusinessResource[],
  days: number,
  now: Date,
  durationMinutes: number | undefined,
  options: AvailabilityOptions = {},
): SlotOption[] {
  const eligible = eligibleResources(resources);
  const per = eligible.map((r) =>
    buildSlots(business, filterOccupancy(hits, r.id, true), days, now, durationMinutes, options).map((s) => s.iso),
  );
  const free = new Set(unionFreeIsos(per));
  return buildSlotGrid(business, [], days, now, durationMinutes, { ...options, includeOccupied: true }).map((s) => ({
    ...s,
    state: free.has(s.iso) ? "free" : "full",
  }));
}

export function assignResourceAtIso(
  business: Pick<Business, "workHours" | "slotMinutes">,
  hits: OccupancyHit[],
  resources: BusinessResource[],
  iso: string,
  days: number,
  now: Date,
  durationMinutes: number | undefined,
  options: AvailabilityOptions = {},
  serviceTitle?: string | null,
): string | null {
  const eligible = eligibleResources(resources, serviceTitle);
  return pickResourceForSlot(eligible, iso, (id) => {
    const free = buildSlots(business, filterOccupancy(hits, id, true), days, now, durationMinutes, options);
    return free.some((s) => Math.abs(new Date(s.iso).getTime() - new Date(iso).getTime()) < 1000);
  });
}
