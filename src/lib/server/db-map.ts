import type { Booking, Business, Category, PriceItem, Review, WorkHour } from "@/lib/types";

export type BizRow = {
  id: string;
  owner_id: string;
  name: string;
  job_title: string | null;
  phone: string | null;
  province: string;
  city: string;
  address: string | null;
  latitude: number | string;
  longitude: number | string;
  category_id: number;
  category_name: string;
  category_slug: string;
  category_icon: string;
  description: string | null;
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  work_hours: WorkHour[] | string;
  slot_minutes: number;
  prices: PriceItem[] | string;
  offer_text: string | null;
  rating_avg: number | string | null;
  rating_count: number | string | null;
  approval_status: string;
  is_active: boolean;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
};

function parseJson<T>(value: T | string, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value ?? fallback;
}

export function visibilityOf(row: BizRow): Business["visibility"] {
  if (row.approval_status === "rejected") return "rejected";
  if (row.approval_status !== "approved" || !row.is_active) return "pending";
  const now = Date.now();
  const sub = row.subscription_ends_at ? new Date(row.subscription_ends_at).getTime() : 0;
  if (sub > now) return "subscribed";
  const trial = row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : 0;
  if (trial > now) return "trial";
  return "expired";
}

export function mapBusiness(row: BizRow): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    jobTitle: row.job_title,
    phone: row.phone,
    province: row.province,
    city: row.city,
    address: row.address,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    categoryId: Number(row.category_id),
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    categoryIcon: row.category_icon,
    description: row.description,
    instagram: row.instagram,
    whatsapp: row.whatsapp,
    website: row.website,
    workHours: parseJson<WorkHour[]>(row.work_hours, []),
    slotMinutes: Number(row.slot_minutes) || 60,
    prices: parseJson<PriceItem[]>(row.prices, []),
    offerText: row.offer_text,
    ratingAvg: Number(row.rating_avg) || 0,
    ratingCount: Number(row.rating_count) || 0,
    approvalStatus: row.approval_status as Business["approvalStatus"],
    isActive: Boolean(row.is_active),
    trialEndsAt: row.trial_ends_at,
    subscriptionEndsAt: row.subscription_ends_at,
    visibility: visibilityOf(row),
    createdAt: row.created_at,
  };
}

export function mapCategory(row: {
  id: number;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
}): Category {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    sortOrder: Number(row.sort_order),
  };
}

export type BookingRow = {
  id: string;
  business_id: string;
  business_name: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  slot_start: string;
  note: string | null;
  service_title: string | null;
  party_size: number | string | null;
  status: string;
  created_at: string;
};

export function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    slotStart: row.slot_start,
    note: row.note,
    serviceTitle: row.service_title ?? null,
    partySize: Number(row.party_size) || 1,
    status: row.status as Booking["status"],
    createdAt: row.created_at,
  };
}

export type ReviewRow = {
  id: string;
  business_id: string;
  user_id: string;
  author_name: string;
  rating: number | string;
  body: string | null;
  owner_reply: string | null;
  owner_reply_at: string | null;
  created_at: string;
};

export function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    authorName: row.author_name,
    rating: Number(row.rating),
    body: row.body,
    ownerReply: row.owner_reply,
    ownerReplyAt: row.owner_reply_at,
    createdAt: row.created_at,
  };
}

export const BIZ_SELECT = `
  b.id, b.owner_id, b.name, b.job_title, b.phone, b.province, b.city, b.address,
  b.latitude, b.longitude, b.category_id, c.name as category_name, c.slug as category_slug,
  c.icon as category_icon, b.description, b.instagram, b.whatsapp, b.website, b.work_hours,
  b.slot_minutes, b.prices, b.offer_text, b.approval_status, b.is_active, b.trial_ends_at,
  b.subscription_ends_at, b.created_at,
  coalesce((select avg(r.rating)::float from reviews r where r.business_id = b.id), 0) as rating_avg,
  coalesce((select count(*)::int from reviews r where r.business_id = b.id), 0) as rating_count
`;

export const VISIBLE_SQL = `
  b.approval_status = 'approved'
  and b.is_active = true
  and (
    (b.subscription_ends_at is not null and b.subscription_ends_at > now())
    or (b.trial_ends_at is not null and b.trial_ends_at > now())
  )
`;

export const BOOKING_SELECT = `
  k.id, k.business_id, b.name as business_name, k.customer_id, k.customer_name,
  k.customer_phone, k.slot_start, k.note, k.service_title, k.party_size, k.status, k.created_at
`;
