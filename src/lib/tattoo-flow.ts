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
