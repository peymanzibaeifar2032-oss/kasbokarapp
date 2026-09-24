import { CalendarPlus, ImagePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StudioVisitNote } from "@/components/studio/visit-note";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/design-images";
import { addBookingToPhoneCalendar, formatFaDateTime, formatToman } from "@/lib/format";
import { friendlyError } from "@/lib/save";
import { scheduleTattooPrepNotices } from "@/lib/studio-notices";
import { STUDIO_ADDRESS, TATTOO_CUSTOMER_STAGE_LABEL, tattooStage } from "@/lib/tattoo-flow";

export type GuestStatus = {
  id: string;
  trackingCode?: string;
  customerName: string;
  style: string;
  placement: string;
  status: string;
  artistMessage: string | null;
  paymentStatus: string | null;
  paymentHoldUntil?: string | null;
  paymentReviewDeadline?: string | null;
  priceMinToman?: number | null;
  sessionMinutes?: number | null;
  sessionCount?: number | null;
  depositToman?: number | null;
  paymentIban?: string | null;
  paymentCardNumber?: string | null;
  proposedSlotStart: string | null;
  proposedSlotEnd?: string | null;
  createdAt: string;
};

export function GuestPayCard({
  item,
  phone,
  onRefresh,
}: {
  item: GuestStatus;
  phone: string;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");
  const stage = tattooStage({
    status: item.status,
    paymentStatus: item.paymentStatus || "not_required",
    paymentReviewDeadline: item.paymentReviewDeadline,
  });
  const canPay = item.paymentStatus === "awaiting_payment" || item.paymentStatus === "rejected";
  const booked = stage === "booked";
  const closed = stage === "rejected" || stage === "expired";
  const showPayment = !booked && !closed && (item.paymentStatus === "proposal_pending" || canPay);

  function addToCalendar() {
    if (!item.proposedSlotStart) return;
    const end = item.proposedSlotEnd ? new Date(item.proposedSlotEnd).getTime() : NaN;
    const start = new Date(item.proposedSlotStart).getTime();
    const minutes = Number.isFinite(end) && end > start ? Math.max(10, Math.round((end - start) / 60000)) : item.sessionMinutes || 120;
    scheduleTattooPrepNotices(item.proposedSlotStart, item.customerName || "مشتری");
    addBookingToPhoneCalendar({
      title: "نوبت تاتو · پیمان زیبائی‌فر",
      startIso: item.proposedSlotStart,
      minutes,
      location: STUDIO_ADDRESS,
      description: [item.style, item.artistMessage].filter(Boolean).join(" — "),
      fileName: `tattoo-${item.id}.ics`,
    });
  }

  async function post(op: "accept" | "receipt") {
    setBusy(true);
    try {
      const res = await fetch(`/api/tattoo-public?op=${op}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: item.id,
          phone,
          ...(op === "receipt" ? { receiptImage: receipt } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "انجام نشد.");
      toast.success(op === "accept" ? "زمان تأیید شد. حالا رسید را بفرست." : "رسید ارسال شد.");
      onRefresh();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`rounded-2xl border p-4 ${closed ? "border-white/10 bg-black/10 opacity-60" : "border-white/10 bg-black/20"}`}>
      <div className="flex items-start justify-between gap-3">
        <strong>{item.customerName}</strong>
        <span className="text-xs text-[#e5d2ae]">{TATTOO_CUSTOMER_STAGE_LABEL[stage]}</span>
      </div>
      <p className="mt-2 text-sm text-white/60">
        {item.style}
        {item.placement ? ` · ${item.placement}` : ""}
      </p>
      {item.artistMessage ? <p className="mt-2 text-sm leading-7 text-white/75">{item.artistMessage}</p> : null}
      {item.priceMinToman != null ? <p className="mt-2 text-sm text-white/65">قیمت: {formatToman(item.priceMinToman)}</p> : null}
      {item.depositToman != null ? <p className="text-sm text-white/65">بیعانه: {formatToman(item.depositToman)}</p> : null}
      {item.proposedSlotStart && !closed ? (
        <div className="mt-3 rounded-xl border border-[#b7955b]/25 bg-[#b7955b]/10 p-3 text-sm text-[#e5d2ae]">
          <p className="font-semibold">{booked ? "زمان نوبت قطعی شد" : "زمان پیشنهادی پیمان"}</p>
          <p className="mt-1 text-base">{formatFaDateTime(item.proposedSlotStart)}</p>
          {booked ? (
            <p className="mt-2 text-sm leading-7 text-white/80">رسید تأیید شد. این زمان در تقویم کاری ثبت شده است.</p>
          ) : null}
          {showPayment && item.paymentIban ? (
            <p className="mt-2" dir="ltr">
              شبا: {item.paymentIban}
            </p>
          ) : null}
          {showPayment && item.paymentCardNumber ? <p dir="ltr">کارت: {item.paymentCardNumber}</p> : null}
          {showPayment ? <StudioVisitNote tone="dark" /> : null}
          {item.paymentStatus === "proposal_pending" ? (
            <Button disabled={busy} className="mt-3 h-11 w-full bg-[#b7955b] text-black" onClick={() => void post("accept")}>
              تأیید این زمان و شروع مهلت پرداخت
            </Button>
          ) : null}
          {booked ? (
            <>
              <Button className="mt-3 h-11 w-full bg-[#b7955b] text-black" onClick={addToCalendar}>
                <CalendarPlus className="size-5" />
                افزودن این زمان به تقویم گوشی
              </Button>
              <StudioVisitNote tone="dark" />
            </>
          ) : null}
        </div>
      ) : null}
      {canPay ? (
        <div className="mt-3 rounded-xl border border-[#b7955b]/35 bg-[#b7955b]/5 p-3">
          <p className="font-semibold text-[#e5d2ae]">ارسال عکس رسید واریز</p>
          {item.paymentHoldUntil ? (
            <p className="mt-1 text-xs text-amber-300">مهلت: {formatFaDateTime(item.paymentHoldUntil)}</p>
          ) : null}
          <label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#b7955b]/50 text-sm font-bold text-[#e5d2ae]">
            <ImagePlus className="size-4" />
            {receipt ? "تغییر عکس رسید" : "انتخاب عکس رسید"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void compressImage(file)
                  .then(setReceipt)
                  .catch((err) => toast.error(friendlyError(err)));
              }}
            />
          </label>
          {receipt ? <img src={receipt} alt="رسید" className="mx-auto mt-3 max-h-40 rounded-lg object-contain" /> : null}
          <Button disabled={busy || !receipt} className="mt-3 h-11 w-full bg-[#b7955b] text-black" onClick={() => void post("receipt")}>
            {busy ? "در حال ارسال…" : "ارسال رسید برای بررسی"}
          </Button>
        </div>
      ) : null}
      {stage === "receipt_review" ? <p className="mt-3 text-sm text-emerald-300">رسید ارسال شد و در دست بررسی است.</p> : null}
    </article>
  );
}
