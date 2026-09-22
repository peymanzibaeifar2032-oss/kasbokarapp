/** Staged tattoo request labels shared by customer and artist panels. */

export type TattooStage =
  | "submitted"
  | "needs_info"
  | "proposal_sent"
  | "awaiting_payment"
  | "receipt_review"
  | "receipt_overdue"
  | "receipt_fix"
  | "expired"
  | "booked"
  | "rejected";

export type TattooStageInput = {
  status: string;
  paymentStatus: string;
  paymentReviewDeadline?: string | null;
};

export function isTattooReviewOverdue(
  paymentStatus: string,
  paymentReviewDeadline: string | null | undefined,
  now = Date.now(),
) {
  if (paymentStatus !== "receipt_submitted" || !paymentReviewDeadline) return false;
  const at = Date.parse(paymentReviewDeadline);
  return Number.isFinite(at) && at <= now;
}

export function tattooStage(request: TattooStageInput, now = Date.now()): TattooStage {
  if (request.status === "booked" || request.paymentStatus === "approved") return "booked";
  if (request.status === "rejected") return "rejected";
  if (request.status === "needs_info") return "needs_info";
  if (request.paymentStatus === "expired") return "expired";
  if (request.paymentStatus === "rejected") return "receipt_fix";
  if (request.paymentStatus === "receipt_submitted") {
    return isTattooReviewOverdue(request.paymentStatus, request.paymentReviewDeadline, now)
      ? "receipt_overdue"
      : "receipt_review";
  }
  if (request.paymentStatus === "awaiting_payment") return "awaiting_payment";
  if (request.paymentStatus === "proposal_pending") return "proposal_sent";
  return "submitted";
}

export const TATTOO_CUSTOMER_STAGE_LABEL: Record<TattooStage, string> = {
  submitted: "در انتظار بررسی",
  needs_info: "نیاز به اطلاعات بیشتر",
  proposal_sent: "پیشنهاد ارسال شده",
  awaiting_payment: "منتظر پرداخت",
  receipt_review: "رسید در دست بررسی",
  receipt_overdue: "بررسی رسید از مهلت گذشته",
  receipt_fix: "رسید نیازمند اصلاح",
  expired: "مهلت واریز تمام شد",
  booked: "رزرو قطعی",
  rejected: "پذیرفته نشد",
};

export const TATTOO_ADMIN_STAGE_LABEL: Record<TattooStage, string> = {
  submitted: "در انتظار بررسی",
  needs_info: "اطلاعات بیشتر",
  proposal_sent: "منتظر تأیید مشتری",
  awaiting_payment: "منتظر پرداخت",
  receipt_review: "رسید در دست بررسی",
  receipt_overdue: "مهلت بررسی گذشته",
  receipt_fix: "منتظر اصلاح رسید",
  expired: "مهلت تمام شد",
  booked: "رزرو قطعی",
  rejected: "ردشده",
};

export const TATTOO_SETTLEMENT_PRESETS = [
  {
    id: "mehr",
    title: "پیمان زیبائی‌فر کارت بانک مهر ایران",
    iban: "IR680600581470017758851001",
    card: "6063731197753891",
  },
  {
    id: "maskan",
    title: "پیمان زیبائی‌فر بانک مسکن",
    iban: "IR160140040000152900013417",
    card: "6280231566846282",
  },
] as const;

export const STUDIO_OWNER_STAFF_NAME = "پیمان زیبائی‌فر";
export const STUDIO_ADDRESS =
  "کرمانشاه، چهارراه بسیج، جنب آتش‌نشانی، بغل موتورسیکلت‌فروشی فقیرزاده، مجتمع ارشاد، طبقه ۴، واحد ۱۶";
export const STUDIO_CONTACT_PHONE = "09216812852";

export function studioVisitText() {
  return `آدرس استودیو:\n${STUDIO_ADDRESS}\nتلفن: ${STUDIO_CONTACT_PHONE}`;
}

export function withStudioVisitDetails(message: string) {
  const trimmed = message.trim();
  if (trimmed.includes("مجتمع ارشاد") && trimmed.includes(STUDIO_CONTACT_PHONE)) return trimmed;
  return `${trimmed}\n\n${studioVisitText()}`;
}

export function isRetiredCollaborator(name: string) {
  return /مهر+داد/.test(name.replace(/\s/g, ""));
}

export function tattooBalance(priceToman: number | null | undefined, paidToman: number | null | undefined) {
  const total = Math.max(0, Number(priceToman) || 0);
  const paid = Math.max(0, Number(paidToman) || 0);
  const remaining = Math.max(0, total - paid);
  return {
    total,
    paid,
    remaining,
    settled: total > 0 && paid >= total,
  };
}

export function formatTattooToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Math.max(0, Math.round(Number(value) || 0)))} تومان`;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Keep only digits so amounts can be stored and summed without separators. */
export function digitsOnly(value: string) {
  let out = "";
  for (const ch of value) {
    const persian = PERSIAN_DIGITS.indexOf(ch);
    if (persian >= 0) {
      out += String(persian);
      continue;
    }
    const arabic = ARABIC_DIGITS.indexOf(ch);
    if (arabic >= 0) {
      out += String(arabic);
      continue;
    }
    if (ch >= "0" && ch <= "9") out += ch;
  }
  return out.replace(/^0+(?=\d)/, "").slice(0, 12);
}

/** Show ۲۲٬۰۰۰٬۰۰۰ while the stored value stays 22000000. */
export function formatGroupedDigits(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return new Intl.NumberFormat("fa-IR").format(Number(digits));
}

export function formatCardNumber(card: string) {
  return card.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1-");
}
