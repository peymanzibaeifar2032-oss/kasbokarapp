export type StudioDeal = "percent" | "daily" | "weekly";

export type StudioArtistCard = {
  id: string;
  name: string;
  email: string;
  phone: string;
  deal: StudioDeal;
  percent: number;
  amountToman: number;
  active: boolean;
};

export type StudioChairJob = {
  id: string;
  customerName: string;
  priceToman: number;
  slotStart: string | null;
};

export type StudioChairRow = StudioArtistCard & {
  grossToman: number;
  jobCount: number;
  days: number;
  weeks: number;
  studioCutToman: number;
  artistKeepToman: number;
  jobs: StudioChairJob[];
};

export function chairCut(deal: StudioDeal, percent: number, amountToman: number, gross: number, days: number, weeks: number) {
  if (deal === "percent") return Math.round((Math.max(0, gross) * Math.min(100, Math.max(0, percent))) / 100);
  if (deal === "daily") return Math.max(0, days) * Math.max(0, amountToman);
  return Math.max(0, weeks) * Math.max(0, amountToman);
}

export function dealLabel(deal: StudioDeal, percent: number, amountToman: number) {
  const money = new Intl.NumberFormat("fa-IR").format(amountToman);
  if (deal === "percent") return `${new Intl.NumberFormat("fa-IR").format(percent)} درصد از قیمت کار`;
  if (deal === "daily") return `روزانه ${money} تومان`;
  return `هفتگی ${money} تومان`;
}

export function weekKey(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const tmp = new Date(date);
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${week}`;
}
