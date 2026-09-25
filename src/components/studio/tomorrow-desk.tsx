import { Button } from "@/components/ui/button";
import { toWhatsAppLink } from "@/lib/format";
import { shiftTehranDayKey, tehranDayKey } from "@/lib/hours";
import { bookingReminderSms, formatTattooToman, tattooBalance } from "@/lib/tattoo-flow";
import type { TattooRequest } from "@/lib/types";

function onDay(request: TattooRequest, dayKey: string) {
  if (request.status !== "booked" || !request.proposedSlotStart) return false;
  return tehranDayKey(new Date(request.proposedSlotStart)) === dayKey;
}

export function StudioTomorrowDesk({
  requests,
  onOpenReceipts,
}: {
  requests: TattooRequest[];
  onOpenReceipts: () => void;
}) {
  const tomorrowKey = shiftTehranDayKey(tehranDayKey(), 1);
  const tomorrow = requests
    .filter((request) => onDay(request, tomorrowKey))
    .sort((a, b) => +new Date(a.proposedSlotStart || 0) - +new Date(b.proposedSlotStart || 0));
  const receipts = requests.filter((request) => request.paymentStatus === "receipt_submitted");
  const expiring = requests.filter((request) => {
    if (request.paymentStatus !== "awaiting_payment" && request.paymentStatus !== "rejected") return false;
    if (!request.paymentHoldUntil) return false;
    const left = new Date(request.paymentHoldUntil).getTime() - Date.now();
    return left > 0 && left <= 2 * 60 * 60 * 1000;
  });

  return (
    <div className="mt-5 grid gap-3">
      {receipts.length || expiring.length ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="font-bold">کار عقب‌افتاده</p>
          <div className="mt-3 flex flex-col gap-2">
            {receipts.length ? (
              <button type="button" className="h-12 rounded-xl bg-primary px-4 text-right text-sm font-bold text-primary-fg" onClick={onOpenReceipts}>
                {new Intl.NumberFormat("fa-IR").format(receipts.length)} رسید تازه منتظر تأیید توست
              </button>
            ) : null}
            {expiring.map((request) => (
              <p key={request.id} className="text-sm leading-7">
                مهلت پرداخت {request.customerName} دارد تمام می‌شود.
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-bold">فردا</h2>
        <p className="mt-1 text-sm leading-6 text-muted">اسم، شماره، محل اجرا، واریزی و مانده. یادآوری ۲۴ساعته با واتساپ آماده است. پیام ۲ساعته ندارد.</p>
        {!tomorrow.length ? <p className="mt-3 text-sm text-muted">برای فردا نوبت قطعی نیست.</p> : null}
        <div className="mt-3 grid gap-3">
          {tomorrow.map((request) => {
            const money = tattooBalance(request.priceMinToman, request.paidToman);
            const when = request.proposedSlotStart
              ? new Date(request.proposedSlotStart).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" })
              : "";
            const href = toWhatsAppLink(
              request.customerPhone,
              bookingReminderSms({
                name: request.customerName,
                when: request.proposedSlotStart,
                remainingToman: money.remaining,
              }),
            );
            return (
              <article key={request.id} className="rounded-2xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <strong>{request.customerName}</strong>
                  <span className="text-sm text-muted">{when}</span>
                </div>
                <p className="mt-1 text-sm" dir="ltr">{request.customerPhone}</p>
                <p className="mt-1 text-sm text-muted">{request.placement}{request.style ? ` · ${request.style}` : ""}</p>
                <p className="mt-1 text-sm">واریزی {formatTattooToman(money.paid)} · مانده {formatTattooToman(money.remaining)}</p>
                {href ? (
                  <Button type="button" className="mt-3 h-11 w-full" asChild>
                    <a href={href}>واتساپ یادآوری فردا</a>
                  </Button>
                ) : (
                  <p className="mt-3 text-sm text-muted">شماره واتساپ معتبر نیست.</p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
