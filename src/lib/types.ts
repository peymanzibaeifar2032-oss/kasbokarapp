export type WorkHour = {
  day: string;
  open: string;
  close: string;
  closed?: boolean;
};

export type PriceItem = {
  title: string;
  price: number;
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
  isActive: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  visibility: "pending" | "trial" | "subscribed" | "expired" | "rejected";
  createdAt: string;
};

export type Booking = {
  id: string;
  businessId: string;
  businessName: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  slotStart: string;
  note: string | null;
  serviceTitle: string | null;
  partySize: number;
  status: "requested" | "confirmed" | "cancelled" | "done";
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
