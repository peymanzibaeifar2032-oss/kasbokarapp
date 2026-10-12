import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ImagePlus, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatSitting } from "@/components/studio/duration-fields";
import { DesignThumbs } from "@/components/studio/design-thumbs";
import type { WizardPayload } from "@/components/studio/request-wizard";
import { StudioDesk } from "@/components/studio/studio-desk";
import { StudioVisitNote } from "@/components/studio/visit-note";
import { StudioTopBar } from "@/components/studio/top-bar";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { compressImage, designFileName, downloadImage } from "@/lib/design-images";
import { formatFaDate, formatFaDateTime, formatToman, addBookingToPhoneCalendar } from "@/lib/format";
import { jalaliDayLabel } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import { TATTOO_CUSTOMER_STAGE_LABEL, STUDIO_ADDRESS, tattooStage } from "@/lib/tattoo-flow";
import { scheduleTattooPrepNotices } from "@/lib/studio-notices";
import type { TattooRequest } from "@/lib/types";

export const Route = createFileRoute("/studio/request")({
  validateSearch: (search: Record<string, unknown>): { day?: string } => {
    return typeof search.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.day) ? { day: search.day } : {};
  },
  component: StudioRequestPage,
});

function StudioRequestPage() {
  const { user } = useCurrentUserState();
  const { day } = Route.useSearch();
  const preferredDay = dayLabel(day);
  const userId = user?.id;
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ code: string; phone: string } | null>(null);

  function refresh() {
    if (!userId) return;
    void saveAction<TattooRequest[]>("myTattooRequests").then((rows) => {
      for (const request of rows) {
        if (tattooStage(request) === "booked" && request.proposedSlotStart) {
          scheduleTattooPrepNotices(request.proposedSlotStart, request.customerName || "مشتری");
        }
      }
    });
  }

  useEffect(() => {
    refresh();
  }, [userId]);

  async function submit(payload: WizardPayload) {
    setBusy(true);
    try {
      const body = {
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerPhone2: payload.customerPhone2,
        customerInstagram: payload.customerInstagram,
        requestType: payload.requestType,
        style: payload.style,
        styles: payload.styles,
        idea: payload.idea,
        placement: payload.placement,
        sizeCm: payload.sizeCm,
        sizeMode: payload.sizeMode,
        colorMode: payload.colorMode,
        bodySide: payload.bodySide,
        preferredDates: payload.preferredDates,
        referralCode: payload.referralCode,
        images: payload.images,
        referenceImages: [] as string[],
        bodyImages: [] as string[],
      };
      let code = "";
      if (userId) {
        const created = await saveAction<{ id: string; trackingCode?: string; referralNote?: string }>("createTattooRequest", body);
        code = created.trackingCode || "";
        if (created.referralNote) toast.message(created.referralNote);
      } else {
        const res = await fetch("/api/tattoo-public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => null)) as { error?: string; trackingCode?: string; referralNote?: string } | null;
        if (!res.ok) throw new Error(data?.error || "ثبت انجام نشد.");
        code = data?.trackingCode || "";
        if (data?.referralNote) toast.message(data.referralNote);
      }
      setSent({ code, phone: payload.customerPhone });
      refresh();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f4efe6] text-[#1c1917]" dir="rtl">
      <StudioTopBar compact light />
      <StudioDesk busy={busy} preferredDay={preferredDay} sent={sent} onSubmit={(payload) => void submit(payload)} />
    </div>
  );
}

function dayLabel(day: string | undefined) {
  if (!day) return "";
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return "";
  return jalaliDayLabel(y, m, d);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-medium text-slate-700">{label}</span>
      <div className="[&_input]:h-12 [&_input]:rounded-xl [&_select]:h-12 [&_select]:rounded-xl [&_textarea]:rounded-xl">
        {children}
      </div>
    </label>
  );
}

function ImageField({
  title,
  hint,
  images,
  onFiles,
  onRemove,
}: {
  title: string;
  hint: string;
  images: string[];
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
      <label className="mt-4 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm">
        <ImagePlus className="size-4 text-[#2f80ed]" /> انتخاب عکس
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      {images.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((src, i) => (
            <div key={`${src.slice(-20)}-${i}`} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
              <img src={src} alt="تصویر انتخابی" className="size-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex">
                <button
                  type="button"
                  className="flex-1 bg-black/70 py-1 text-[10px] text-white"
                  onClick={() => downloadImage(src, designFileName(title, i))}
                >
                  دانلود
                </button>
                <button
                  type="button"
                  className="flex-1 bg-black/80 py-1 text-[10px] text-white"
                  onClick={() => onRemove(i)}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RequestCard({ request, onChange }: { request: TattooRequest; onChange: () => void }) {
  const [receipt, setReceipt] = useState(request.receiptImage ?? "");
  const [receiptName, setReceiptName] = useState("");
  const [busy, setBusy] = useState(false);
  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setReceipt(await compressImage(file));
      setReceiptName(file.name);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }
  async function submitReceipt() {
    if (!receipt) return toast.error("عکس رسید را انتخاب کنید.");
    setBusy(true);
    try {
      await saveAction("submitTattooReceipt", { requestId: request.id, receiptImage: receipt });
      toast.success("رسید ارسال شد و در دست بررسی است.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  async function acceptProposal() {
    setBusy(true);
    try {
      await saveAction("acceptTattooProposal", { requestId: request.id });
      toast.success("زمان تأیید شد. اکنون رسید بیعانه را ارسال کنید.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  const stage = tattooStage(request);
  const canPay = request.paymentStatus === "awaiting_payment" || request.paymentStatus === "rejected";
  const paymentText =
    stage === "receipt_review"
      ? request.paymentReviewDeadline
        ? `رسید در دست بررسی؛ نتیجه حداکثر تا ${formatFaDateTime(request.paymentReviewDeadline)}`
        : "رسید در دست بررسی؛ نتیجه حداکثر تا ۱۲ ساعت"
      : stage === "receipt_overdue"
        ? "بررسی رسید از مهلت ۱۲ ساعته گذشته؛ زمان شما قفل مانده تا پیمان نتیجه را اعلام کند."
        : stage === "booked"
          ? "پرداخت تأیید شد و نوبت قطعی است."
          : stage === "expired"
            ? "مهلت واریز تمام شد و این زمان آزاد شد. منتظر زمان تازه از پیمان بمانید."
            : stage === "proposal_sent"
              ? "پیشنهاد پیمان آماده تأیید است. مهلت ۶ ساعته بعد از تأیید شما شروع می‌شود."
              : stage === "receipt_fix"
                ? "رسید نیاز به اصلاح دارد. ۶ ساعت برای ارسال رسید تازه فرصت دارید."
                : stage === "awaiting_payment"
                  ? "زمان تأیید شد. تا ۶ ساعت رسید واریز را بفرستید."
                  : null;
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400">{formatFaDate(request.createdAt)}</p>
          <h3 className="mt-1 font-bold">{request.style}</h3>
        </div>
        <span className="rounded-full bg-[#2f80ed]/10 px-2 py-1 text-[11px] text-[#1c3d52]">
          {TATTOO_CUSTOMER_STAGE_LABEL[stage]}
        </span>
      </div>
      <DesignThumbs
        images={[...request.referenceImages, ...request.bodyImages]}
        filePrefix={request.style}
        tone="light"
      />
      {request.artistMessage ? (
        <p className="mt-4 text-sm leading-7 text-slate-600">{request.artistMessage}</p>
      ) : null}
      {request.status === "approved" || request.status === "booked" ? (
        <div className="mt-4 space-y-1 text-sm text-slate-600">
          {request.priceMinToman != null ? <p>قیمت: {formatToman(request.priceMinToman)}</p> : null}
          {request.sessionCount ? (
            <p>تعداد جلسه: {new Intl.NumberFormat("fa-IR").format(request.sessionCount)}</p>
          ) : null}
          {request.sessionMinutes ? (
            <p>
              مدت هر جلسه: {formatSitting(request.sessionMinutes)}
            </p>
          ) : null}
          {request.depositToman != null ? <p>بیعانه: {formatToman(request.depositToman)}</p> : null}
          {request.proposedSlotStart ? (
            <div className="mt-3 rounded-xl border border-[#2f80ed]/25 bg-[#2f80ed]/10 p-3 text-[#1c3d52]">
              <p className="font-semibold">زمان پیشنهادی پیمان</p>
              <p>{formatFaDateTime(request.proposedSlotStart)}</p>
              {request.paymentStatus === "proposal_pending" &&
              (request.paymentIban || request.paymentCardNumber) ? (
                <div className="mt-2 text-sm">
                  {request.paymentIban ? <p dir="ltr">شبا: {request.paymentIban}</p> : null}
                  {request.paymentCardNumber ? (
                    <p dir="ltr">کارت: {request.paymentCardNumber}</p>
                  ) : null}
                  <StudioVisitNote tone="light" />
                </div>
              ) : null}
              {request.paymentStatus === "proposal_pending" ? (
                <Button
                  disabled={busy}
                  className="mt-3 w-full bg-[#2f80ed] text-white"
                  onClick={() => void acceptProposal()}
                >
                  تأیید این زمان و شروع مهلت پرداخت
                </Button>
              ) : null}
            </div>
          ) : null}
          {canPay && (request.paymentIban || request.paymentCardNumber) ? (
            <div className="mt-3 rounded-xl border border-[#2f80ed]/25 bg-[#2f80ed]/10 p-3 text-[#1c3d52]">
              <p className="font-semibold">اطلاعات واریز بیعانه</p>
              {request.paymentIban ? <p dir="ltr">شبا: {request.paymentIban}</p> : null}
              {request.paymentCardNumber ? (
                <p dir="ltr">کارت: {request.paymentCardNumber}</p>
              ) : null}
              <StudioVisitNote tone="light" />
              <p className="text-xs">
                {stage === "receipt_fix"
                  ? "تا پایان مهلت اصلاح، همین زمان قفل می‌ماند."
                  : "از زمان تأیید شما، ۶ ساعت برای واریز فرصت دارید."}
              </p>
            </div>
          ) : null}
          {request.paymentHoldUntil && canPay ? (
            <p className="text-amber-700">
              مهلت واریز: {formatFaDateTime(request.paymentHoldUntil)}
            </p>
          ) : null}
          {paymentText ? <p className="text-emerald-700">{paymentText}</p> : null}
          {stage === "booked" ? <StudioVisitNote tone="light" /> : null}
          {stage === "booked" && request.proposedSlotStart ? (
            <Button
              className="mt-3 w-full bg-[#2f80ed] text-white"
              onClick={() =>
                addBookingToPhoneCalendar({
                  title: "نوبت تاتو · پیمان زیبائی‌فر",
                  startIso: request.proposedSlotStart!,
                  minutes:
                    request.proposedSlotEnd && request.proposedSlotStart
                      ? Math.max(
                          10,
                          Math.round(
                            (new Date(request.proposedSlotEnd).getTime() -
                              new Date(request.proposedSlotStart).getTime()) /
                              60000,
                          ),
                        )
                      : request.sessionMinutes || 120,
                  location: STUDIO_ADDRESS,
                  description: [request.style, request.artistMessage].filter(Boolean).join(" — "),
                  fileName: `tattoo-${request.id}.ics`,
                })
              }
            >
              افزودن به تقویم گوشی
            </Button>
          ) : null}
          {canPay ? (
            <div className="mt-4 rounded-2xl border border-[#2f80ed]/30 bg-[#2f80ed]/5 p-4">
              <p className="font-semibold text-[#1c3d52]">
                {stage === "receipt_fix" ? "ارسال رسید اصلاح‌شده" : "ارسال عکس رسید واریز"}
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                عکس رسید را از گالری گوشی انتخاب کنید؛ سپس دکمه ارسال را بزنید.
              </p>
              <label className="mt-3 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2f80ed] bg-[#2f80ed]/10 px-3 font-bold text-[#1c3d52]">
                <ImagePlus className="size-5" />
                {receipt ? "تغییر عکس رسید" : "انتخاب عکس رسید از گالری"}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => void pick(e.target.files?.[0])}
                />
              </label>
              {receiptName ? (
                <p className="mt-2 text-center text-xs text-emerald-700">
                  انتخاب شد: {receiptName}
                </p>
              ) : null}
              {receipt ? (
                <img
                  src={receipt}
                  alt="پیش‌نمایش رسید"
                  className="mx-auto mt-3 max-h-52 rounded-xl border border-slate-200 object-contain"
                />
              ) : null}
              <Button
                disabled={busy || !receipt}
                className="mt-3 h-12 w-full"
                onClick={() => void submitReceipt()}
              >
                {busy ? "در حال ارسال…" : "ارسال رسید برای بررسی"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
