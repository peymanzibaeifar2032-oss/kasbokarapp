export type WorkShift = {
  open: string;
  close: string;
};

export type WorkHour = {
  day: string;
  open: string;
  close: string;
  closed?: boolean;
  /** Extra same-day shifts. When set, open/close is the first shift. */
  shifts?: WorkShift[];
};

export type SpecialDay = {
  dayKey: string;
  closed: boolean;
  shifts?: WorkShift[];
  note?: string | null;
};

export type PriceItem = {
  title: string;
  price: number;
  /** Real service duration in minutes. Absent = unknown; slotMinutes is only a fallback quantum. */
  minutes?: number;
  bufferBefore?: number;
  bufferAfter?: number;
  depositType?: "none" | "fixed" | "percent";
  depositAmount?: number;
  depositPercent?: number;
};


export type Category = {
  id: number;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
};

export type Business = {
  id: string;
  ownerId: string;
  name: string;
  jobTitle: string | null;
  phone: string | null;
  province: string;
  city: string;
  address: string | null;
  latitude: number;
  longitude: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string;
  description: string | null;
  instagram: string | null;
  whatsapp: string | null;
  website: string | null;
  workHours: WorkHour[];
  slotMinutes: number;
  prices: PriceItem[];
  offerText: string | null;
  ratingAvg: number;
  ratingCount: number;
  approvalStatus: "pending" | "approved" | "rejected";
  verificationLevel: "unverified" | "basic" | "contact_verified" | "ownership_verified" | "identity_verified";
  rankingFreshAt: string | null;
  isActive: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  visibility: "pending" | "trial" | "subscribed" | "expired" | "rejected";
  createdAt: string;
  hasFreeToday?: boolean;
  nextFreeIso?: string | null;
  nextFreeLabel?: string | null;
  specialHours?: SpecialDay[];
  bookingHorizonDays?: number;
};

export type BookingKind = "booking" | "block";
export type BookingSource = "online" | "manual";
export type BookingEventType = "booking" | "block" | "break" | "personal" | "holiday" | "manual";
export type BookingStatus = "requested" | "confirmed" | "cancelled" | "done" | "no_show";

export type Booking = {
  id: string;
  businessId: string;
  businessName: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  slotStart: string;
  slotEnd: string | null;
  kind: BookingKind;
  source: BookingSource;
  eventType: BookingEventType;
  bufferBefore: number;
  bufferAfter: number;
  note: string | null;
  serviceTitle: string | null;
  partySize: number;
  status: BookingStatus;
  createdAt: string;
  resourceId?: string | null;
  resourceName?: string | null;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  kind: string;
  bookingId: string | null;
  businessId: string | null;
  readAt: string | null;
  createdAt: string;
};


export type Review = {
  id: string;
  businessId: string;
  userId: string;
  authorName: string;
  rating: number;
  body: string | null;
  ownerReply: string | null;
  ownerReplyAt: string | null;
  createdAt: string;
};

export type Profile = {
  userId: string;
  displayName: string;
  phone: string | null;
  isAdmin: boolean;
};

export type OwnerStats = {
  requested: number;
  confirmed: number;
  done: number;
  cancelled: number;
  reviews: number;
  ratingAvg: number;
};

export type CityRank = {
  rank: number;
  total: number;
  city: string;
  categoryName: string;
};

export type BusyInterval = {
  start: string;
  end: string;
  resourceId?: string | null;
};

export type TattooRequestStatus = "submitted" | "needs_info" | "approved" | "rejected" | "booked";

export type TattooRequest = {
  id: string;
  customerId: string;
  businessId: string | null;
  bookingId: string | null;
  customerName: string;
  customerPhone: string;
  requestType: "new" | "coverup" | "consultation";
  style: string;
  idea: string;
  placement: string;
  sizeCm: string;
  preferredDates: string | null;
  budgetToman: number | null;
  referenceImages: string[];
  bodyImages: string[];
  status: TattooRequestStatus;
  priceMinToman: number | null;
  priceMaxToman: number | null;
  sessionMinutes: number | null;
  sessionCount: number | null;
  depositToman: number | null;
  artistMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MehrLoanLeadStatus = "reviewing" | "contacted" | "purchased" | "rejected";

export type MehrLoanLead = {
  id: string;
  trackingCode: string;
  fullName: string;
  phone: string;
  scoreAmountToman: number | null;
  repaymentMonths: number | null;
  city: string | null;
  description: string | null;
  status: MehrLoanLeadStatus;
  createdAt: string;
  updatedAt: string;
};
