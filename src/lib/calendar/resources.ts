import { buildSlotGrid, buildSlots, hoursForDay, shiftsFor, WEEKDAYS_FA, type AvailabilityOptions, type SlotOption } from "../hours.ts";
import type { SpecialDay, WorkHour, WorkShift } from "@/lib/types";
import type { Business } from "@/lib/types";

export const RESOURCE_KINDS = ["staff", "chair", "room", "equipment"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export const SLICE1_CAPACITY = 1;

export type BusinessResource = {
  id: string;
  businessId: string;
  kind: ResourceKind;
  name: string;
  color: string | null;
  active: boolean;
  sortOrder: number;
  capacity?: number;
  workHours?: WorkHour[] | null;
  specialHours?: SpecialDay[] | null;
};

export type OccupancyHit = {
  start: string;
  end: string;
  resourceId?: string | null;
};

export function hasActiveResources(resources: { active?: boolean }[] | null | undefined) {
  return Boolean(resources?.some((r) => r.active !== false));
}

function isBlankId(id: string | null | undefined) {
  return !id || !id.trim();
}

/** Wildcard NULL occupies every resource. Legacy (no resources) is business-wide. */
export function resourcesConflict(
  a: string | null | undefined,
  b: string | null | undefined,
  hasResources: boolean,
): boolean {
  if (!hasResources) return true;
  if (isBlankId(a) || isBlankId(b)) return true;
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

/** Phase 1: every active resource is eligible. Service mapping is deferred. */
export function eligibleResources(resources: BusinessResource[], _serviceTitle?: string | null): BusinessResource[] {
  return resources.filter((r) => r.active !== false);
}

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (h === 0 && m === 0) return 24 * 60;
  return (h || 0) * 60 + (m || 0);
}

function hhmm(total: number) {
  const t = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(t / 60);
  const mm = t % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function intersectShifts(a: WorkShift[], b: WorkShift[]): WorkShift[] {
  const out: WorkShift[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(minutesOf(x.open), minutesOf(y.open));
      let xClose = minutesOf(x.close);
      let yClose = minutesOf(y.close);
      if (xClose <= minutesOf(x.open)) xClose += 24 * 60;
      if (yClose <= minutesOf(y.open)) yClose += 24 * 60;
      const end = Math.min(xClose, yClose);
      if (end > start) out.push({ open: hhmm(start), close: hhmm(end) });
    }
  }
  return out;
}

export function intersectWeeklyHours(business: WorkHour[], resource?: WorkHour[] | null): WorkHour[] {
  if (!resource?.length) return business;
  return WEEKDAYS_FA.map((day, weekday) => {
    const bizDay = hoursForDay(business, weekday);
    const resDay = resource.find((h) => h.day === day);
    if (!resDay) {
      return bizDay ?? { day, open: "", close: "", closed: true };
    }
    if (!bizDay || bizDay.closed || resDay.closed) {
      return { day, open: "", close: "", closed: true };
    }
    const shifts = intersectShifts(shiftsFor(bizDay), shiftsFor(resDay));
    if (!shifts.length) return { day, open: "", close: "", closed: true };
    return { day, open: shifts[0].open, close: shifts[shifts.length - 1].close, shifts };
  });
}

function businessShiftsOnDay(
  businessHours: WorkHour[],
  businessSpecial: SpecialDay[],
  dayKey: string,
  weekday: number,
): WorkShift[] {
  const override = businessSpecial.find((s) => s.dayKey === dayKey);
  if (override) return override.closed ? [] : override.shifts ?? [];
  return shiftsFor(hoursForDay(businessHours, weekday));
}

export function intersectSpecialDays(
  businessHours: WorkHour[],
  businessSpecial: SpecialDay[] = [],
  resourceSpecial?: SpecialDay[] | null,
): SpecialDay[] {
  if (!resourceSpecial?.length) return businessSpecial;
  const keys = new Set([...businessSpecial.map((s) => s.dayKey), ...resourceSpecial.map((s) => s.dayKey)]);
  const out: SpecialDay[] = [];
  for (const dayKey of keys) {
    const [y, m, d] = dayKey.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const bizShifts = businessShiftsOnDay(businessHours, businessSpecial, dayKey, weekday);
    const res = resourceSpecial.find((s) => s.dayKey === dayKey);
    if (!res) {
      const biz = businessSpecial.find((s) => s.dayKey === dayKey);
      if (biz) out.push(biz);
      continue;
    }
    if (!bizShifts.length || res.closed) {
      out.push({ dayKey, closed: true, shifts: [] });
      continue;
    }
    const resShifts = res.shifts?.length ? res.shifts : [];
    if (!resShifts.length) {
      out.push({ dayKey, closed: true, shifts: [] });
      continue;
    }
    const shifts = intersectShifts(bizShifts, resShifts);
    out.push(shifts.length ? { dayKey, closed: false, shifts } : { dayKey, closed: true, shifts: [] });
  }
  return out;
}

export function effectiveSchedule(
  businessHours: WorkHour[],
  businessSpecial: SpecialDay[] = [],
  resourceHours?: WorkHour[] | null,
  resourceSpecial?: SpecialDay[] | null,
): { workHours: WorkHour[]; specialDays: SpecialDay[] } {
  return {
    workHours: intersectWeeklyHours(businessHours, resourceHours),
    specialDays: intersectSpecialDays(businessHours, businessSpecial, resourceSpecial),
  };
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
  excludeIds?: Iterable<string>,
): string | null {
  const skip = excludeIds ? new Set(excludeIds) : null;
  for (const r of resources) {
    if (r.active === false) continue;
    if (skip?.has(r.id)) continue;
    if (isFree(r.id, iso)) return r.id;
  }
  return null;
}

/** Reschedule keeps the original resource unless the caller sends a new id. */
export function resolveRescheduleResource(
  requested: string | null | undefined,
  original: string | null | undefined,
): string | null {
  if (requested == null) return original?.trim() || null;
  const next = requested.trim();
  if (!next) return original?.trim() || null;
  return next;
}

/** Staffed businesses must persist a concrete resource. NULL is wildcard occupancy, not Any Staff. */
export function persistableResourceId(hasResources: boolean, resourceId: string | null | undefined): string | null {
  if (!hasResources) return null;
  const id = resourceId?.trim() || "";
  return id || null;
}

export function slotsForResource(
  business: Pick<Business, "workHours" | "slotMinutes">,
  hits: OccupancyHit[],
  resource: BusinessResource | string | null | undefined,
  hasResources: boolean,
  days: number,
  now: Date,
  durationMinutes: number | undefined,
  options: AvailabilityOptions = {},
  includeOccupied = false,
): SlotOption[] {
  const resourceId = typeof resource === "string" || resource == null ? resource : resource.id;
  const schedule =
    resource && typeof resource !== "string"
      ? effectiveSchedule(business.workHours, options.specialDays ?? [], resource.workHours, resource.specialHours)
      : { workHours: business.workHours, specialDays: options.specialDays ?? [] };
  const busy = filterOccupancy(hits, resourceId, hasResources);
  const opts = { ...options, specialDays: schedule.specialDays, includeOccupied: includeOccupied || options.includeOccupied };
  const shaped = { workHours: schedule.workHours, slotMinutes: business.slotMinutes };
  return includeOccupied || options.includeOccupied
    ? buildSlotGrid(shaped, busy, days, now, durationMinutes, opts)
    : buildSlots(shaped, busy, days, now, durationMinutes, opts);
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
    slotsForResource(business, hits, r, true, days, now, durationMinutes, options).map((s) => s.iso),
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
  excludeIds?: Iterable<string>,
): string | null {
  const eligible = eligibleResources(resources);
  return pickResourceForSlot(
    eligible,
    iso,
    (id) => {
      const row = eligible.find((r) => r.id === id);
      if (!row) return false;
      const free = slotsForResource(business, hits, row, true, days, now, durationMinutes, options);
      return free.some((s) => Math.abs(new Date(s.iso).getTime() - new Date(iso).getTime()) < 1000);
    },
    excludeIds,
  );
}
