export const TATTOO_REQUEST_LABEL: Record<string, string> = {
  new: "تاتوی جدید",
  custom: "طراحی اختصاصی",
  coverup: "کاور تاتوی قبلی",
  repair: "ترمیم",
  continuation: "تکمیل تاتوی قبلی",
  consultation: "مشاوره",
};

export const TATTOO_STYLE_OPTIONS = [
  ["blackgrey", "سیاه و خاکستری"],
  ["realism", "رئالیسم"],
  ["micro", "میکرو رئالیسم"],
  ["fineline", "خطوط ظریف"],
  ["linework", "خط‌کاری"],
  ["blackwork", "بلک‌ورک"],
  ["dotwork", "نقطه‌کاری"],
  ["geometric", "هندسی"],
  ["lettering", "نوشته و تایپوگرافی"],
  ["portrait", "پرتره"],
  ["traditional", "سنتی"],
  ["neo", "نئوتردیشنال"],
  ["japanese", "ژاپنی"],
  ["minimal", "مینیمال"],
  ["watercolor", "آبرنگی"],
  ["tribal", "ترایبال"],
  ["other", "سایر"],
  ["unknown", "سبک را نمی‌دانم"],
] as const;

export const TATTOO_BODY_PARTS = ["ساعد", "بازو", "دست", "انگشت", "سینه", "شکم", "پهلو", "پشت", "گردن", "سر", "ران", "ساق", "زانو", "مچ", "پا", "سایر"] as const;
export const TATTOO_SIDES = [
  ["right", "راست"],
  ["left", "چپ"],
  ["center", "وسط"],
] as const;
export const TATTOO_SIZE_LABELS = [
  ["tiny", "خیلی کوچک"],
  ["small", "کوچک"],
  ["medium", "متوسط"],
  ["large", "بزرگ"],
  ["xlarge", "خیلی بزرگ"],
] as const;
export const TATTOO_COLORS = [
  ["blackgrey", "سیاه و خاکستری"],
  ["full", "تمام‌رنگی"],
  ["accent", "سیاه با یک رنگ"],
  ["unsure", "هنوز تصمیم نگرفتم"],
] as const;

export type EstimateSample = {
  id: string;
  title: string;
  priceToman: number;
  requestType: string;
  placement: string;
  style: string;
  sizeCm: string;
  colorMode: string;
  anchor: boolean;
};

export type EstimateDraft = {
  requestType: string;
  placement: string;
  style: string;
  sizeCm: string;
  colorMode: string;
  idea: string;
  imageCount: number;
};

export type SimilarSample = { id: string; title: string; priceToman: number; score: number };

export type TattooEstimate = {
  minToman: number | null;
  maxToman: number | null;
  minutes: number;
  sessions: number;
  complexity: number;
  confidence: "low" | "mid" | "high";
  validSamples: number;
  similarCount: number;
  similarMin: number | null;
  similarMax: number | null;
  median: number | null;
  factors: string[];
  similar: SimilarSample[];
};

const STOP = new Set(["و", "یا", "از", "در", "به", "با", "یک", "را", "که", "این", "برای"]);

function tokens(value: string) {
  return value
    .toLowerCase()
    .split(/[^0-9a-z\u0600-\u06ff]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !STOP.has(part));
}

export function sizeBand(sizeCm: string) {
  const text = sizeCm.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  if (/خیلی\s*بزرگ|فول|پشت کامل/.test(sizeCm)) return 5;
  if (/خیلی\s*کوچک/.test(sizeCm)) return 1;
  if (/کوچک/.test(sizeCm) && !/خیلی/.test(sizeCm)) return 2;
  if (/متوسط/.test(sizeCm)) return 3;
  if (/بزرگ/.test(sizeCm)) return 4;
  const nums = [...text.matchAll(/\d+(?:[./]\d+)?/g)].map((m) => Number(m[0].replace("/", "."))).filter((n) => n > 0);
  if (!nums.length) return 3;
  const area = nums.length >= 2 ? nums[0] * nums[1] : nums[0] * nums[0];
  if (area < 25) return 1;
  if (area < 80) return 2;
  if (area < 220) return 3;
  if (area < 500) return 4;
  return 5;
}

function overlap(a: string, b: string) {
  const left = new Set(tokens(a));
  const right = tokens(b);
  if (!left.size || !right.length) return 0;
  return right.filter((token) => left.has(token)).length / Math.max(left.size, right.length);
}

export function sampleScore(draft: EstimateDraft, sample: EstimateSample) {
  let score = 0;
  if (sample.requestType && sample.requestType === draft.requestType) score += 24;
  else if ((draft.requestType === "coverup" || draft.requestType === "repair") && (sample.requestType === "coverup" || sample.requestType === "repair")) score += 12;
  score += Math.round(overlap(draft.placement, sample.placement) * 26);
  score += Math.round(overlap(draft.style, sample.style) * 22);
  const gap = Math.abs(sizeBand(draft.sizeCm) - sizeBand(sample.sizeCm));
  if (gap === 0) score += 20;
  else if (gap === 1) score += 8;
  if (draft.colorMode && sample.colorMode && draft.colorMode === sample.colorMode) score += 8;
  if (sample.anchor) score += 16;
  return score;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function roundMoney(value: number) {
  const step = value >= 5_000_000 ? 500_000 : 100_000;
  return Math.max(step, Math.round(value / step) * step);
}

export function calibrationFactor(ratios: number[]) {
  const usable = ratios.filter((ratio) => ratio > 0 && Number.isFinite(ratio));
  if (usable.length < 3) return 1;
  const factor = median(usable);
  return Math.min(1.6, Math.max(0.75, factor));
}

export function estimateTattooPrice(draft: EstimateDraft, samples: EstimateSample[], ratios: number[] = []): TattooEstimate {
  const valid = samples.filter((sample) => sample.priceToman > 0);
  const ranked = valid
    .map((sample) => ({ sample, score: sampleScore(draft, sample) }))
    .sort((a, b) => b.score - a.score || Number(b.sample.anchor) - Number(a.sample.anchor));
  const best = ranked[0]?.score ?? 0;
  const picked = ranked.filter((row) => row.score >= 18 && row.score >= best - 12).slice(0, 5);
  const prices = picked.map((row) => row.sample.priceToman);
  const mid = median(prices);
  const band = sizeBand(draft.sizeCm);
  const sampleBand = picked.length ? median(picked.map((row) => sizeBand(row.sample.sizeCm))) : band;
  const sizeAdjust = Math.min(1.7, Math.max(0.65, 1 + (band - sampleBand) * 0.16));
  const cover = draft.requestType === "coverup" || draft.requestType === "repair";
  const colorBoost = draft.colorMode === "full" ? 1.12 : draft.colorMode === "accent" ? 1.05 : 1;
  const factor = calibrationFactor(ratios);
  const complexity = Math.min(10, Math.max(1, band + (cover ? 2 : 0) + (draft.colorMode === "full" ? 1 : 0) + (draft.imageCount > 3 ? 1 : 0) + (draft.idea.length > 280 ? 1 : 0)));
  const minutes = complexity * 50;
  const sessions = Math.max(1, Math.ceil(minutes / 180));
  const factors = [
    `اندازه در گروه ${["", "خیلی کوچک", "کوچک", "متوسط", "بزرگ", "خیلی بزرگ"][band]}`,
    cover ? "کاور یا ترمیم سخت‌تر از کار روی پوست خالی است." : "اجرا روی پوست بدون تاتوی قبلی.",
    "عکس‌ها ذخیره شده‌اند. هنوز تحلیل تصویری واقعی روی آن‌ها انجام نمی‌شود.",
  ];
  if (!picked.length || mid <= 0) {
    return {
      minToman: null,
      maxToman: null,
      minutes,
      sessions,
      complexity,
      confidence: "low",
      validSamples: valid.length,
      similarCount: 0,
      similarMin: null,
      similarMax: null,
      median: null,
      factors: [...factors, "نمونه قیمت معتبر و شبیه به این درخواست پیدا نشد."],
      similar: [],
    };
  }
  const adjusted = mid * sizeAdjust * colorBoost * factor;
  const spread = picked.length >= 4 ? 0.16 : 0.28;
  const confidence: TattooEstimate["confidence"] = picked.length >= 4 && picked[0].score >= 50 ? "high" : picked.length >= 2 ? "mid" : "low";
  return {
    minToman: roundMoney(adjusted * (1 - spread)),
    maxToman: roundMoney(adjusted * (1 + spread)),
    minutes,
    sessions,
    complexity,
    confidence,
    validSamples: valid.length,
    similarCount: picked.length,
    similarMin: Math.min(...prices),
    similarMax: Math.max(...prices),
    median: mid,
    factors,
    similar: picked.slice(0, 5).map((row) => ({
      id: row.sample.id,
      title: row.sample.title,
      priceToman: row.sample.priceToman,
      score: row.score,
    })),
  };
}

export function formatEstimateRange(min: number, max: number) {
  const million = (value: number) => new Intl.NumberFormat("fa-IR").format(Math.round(value / 1_000_000));
  if (min >= 1_000_000 && max >= 1_000_000) {
    if (Math.round(min / 1_000_000) === Math.round(max / 1_000_000)) return `${million(min)} میلیون تومان`;
    return `${million(min)} تا ${million(max)} میلیون تومان`;
  }
  const fmt = new Intl.NumberFormat("fa-IR");
  return `${fmt.format(min)} تا ${fmt.format(max)} تومان`;
}
