export type ChairRentModel = "percent" | "flat";
export type ChairFlatPeriod = "day" | "week" | "month";
export type ChairJobStatus = "planned" | "done" | "cancelled";

export type StudioChairArtist = {
  id: string;
  name: string;
  email: string;
  phone: string;
  rentModel: ChairRentModel;
  percentShop: number;
  flatPeriod: ChairFlatPeriod;
  flatAmountToman: number;
  startedAt: string;
  active: boolean;
};

export type StudioChairJob = {
  id: string;
  artistId: string;
  customerName: string;
  customerPhone: string;
  idea: string;
  priceToman: number;
  slotStart: string;
  slotEnd: string;
  status: ChairJobStatus;
  createdAt: string;
};

export type StudioChairRentPayment = {
  id: string;
  artistId: string;
  amountToman: number;
  note: string;
  createdAt: string;
};

export function clampShopPercent(value: number) {
  const n = Math.round(Number(value) || 0);
  return Math.min(90, Math.max(0, n));
}

export function splitChairJob(priceToman: number, percentShop: number) {
  const total = Math.max(0, Math.round(Number(priceToman) || 0));
  const shopPct = clampShopPercent(percentShop);
  const shop = Math.round((total * shopPct) / 100);
  return {
    total,
    shop,
    artist: Math.max(0, total - shop),
    percentShop: shopPct,
  };
}

export function sumChairJobs(jobs: { priceToman: number; status: string }[], percentShop: number) {
  const done = jobs.filter((job) => job.status === "done");
  const total = done.reduce((sum, job) => sum + Math.max(0, Math.round(Number(job.priceToman) || 0)), 0);
  const split = splitChairJob(total, percentShop);
  return { jobCount: done.length, ...split };
}

/** How many flat-rent units fall inside a Jalali month window. */
export function flatUnitsInRange(period: ChairFlatPeriod, dayCount: number) {
  const days = Math.max(0, Math.round(dayCount));
  if (!days) return 0;
  if (period === "day") return days;
  if (period === "week") return Math.ceil(days / 7);
  return 1;
}

export function flatRentDue(period: ChairFlatPeriod, amountToman: number, units: number) {
  const amount = Math.max(0, Math.round(Number(amountToman) || 0));
  return amount * Math.max(0, Math.round(units));
}

export function chairBalance(dueToman: number, paidToman: number) {
  const due = Math.max(0, Math.round(Number(dueToman) || 0));
  const paid = Math.max(0, Math.round(Number(paidToman) || 0));
  return {
    due,
    paid,
    remaining: Math.max(0, due - paid),
    settled: paid >= due && due > 0,
  };
}

export const CHAIR_FLAT_PERIOD_LABEL: Record<ChairFlatPeriod, string> = {
  day: "روزانه",
  week: "هفتگی",
  month: "ماهانه",
};

export const CHAIR_MODEL_LABEL: Record<ChairRentModel, string> = {
  percent: "درصد از کار",
  flat: "اجاره ثابت",
};
