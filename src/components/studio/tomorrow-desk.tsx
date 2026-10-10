import { Button } from "@/components/ui/button";
import { toSmsLink } from "@/lib/format";
import { tehranDayKey } from "@/lib/hours";
import { bookingReminderSms, aftercareGuideSms, depositCardSms, formatTattooToman, honorificForName, tattooBalance } from "@/lib/tattoo-flow";
import type { TattooRequest } from "@/lib/types";

function onDay(request: TattooRequest, dayKey: string) {
  if (request.status !== "booked" || !request.proposedSlotStart) return false;
  return tehranDayKey(new Date(request.proposedSlotStart)) === dayKey;
}

export function StudioTomorrowDesk({
  requests,
  onOpenReceipts,
  showToday = false,
}: {
  requests: TattooRequest[];
  onOpenReceipts: () => void;
  showToday?: boolean;
}) {
  const todayKey = tehranDayKey();
  const todayJobs = requests
    .filter((request) => onDay(request, todayKey))
    .sort((a, b) => +new Date(a.proposedSlotStart || 0) - +new Date(b.proposedSlotStart || 0));
  const receipts = requests.filter((request) => request.paymentStatus === "receipt_submitted");
  const expiring = requests.filter((request) => {
    if (request.paymentStatus !== "awaiting_payment" && request.paymentStatus !== "rejected") return false;
    if (!request.paymentHoldUntil) return false;
    const left = new Date(request.paymentHoldUntil).getTime() - Date.now();
    return left > 0 && left <= 2 * 60 * 60 * 1000;
  });

  if (!showToday && !receipts.length && !expiring.length) return null;

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

      {showToday ? (
      <section className="rounded-3xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">امروز</h2>
          <span className="rounded-full bg-[#2f80ed] px-3 py-1 text-sm font-bold text-white">{new Intl.NumberFormat("fa-IR").format(todayJobs.length)}</span>
        </div>
        {!todayJobs.length ? <p className="mt-3 text-sm text-muted">برای امروز نوبت قطعی نیست.</p> : null}
        <div className="mt-3 grid gap-3">
          {todayJobs.map((request) => {
            const money = tattooBalance(request.priceMinToman, request.paidToman);
            const when = request.proposedSlotStart
              ? new Date(request.proposedSlotStart).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" })
              : "";
            function send(text: string) {
              const href = toSmsLink(request.customerPhone, text);
              if (href) window.location.assign(href);
            }
            function remind() {
              send(
                bookingReminderSms({
                  honorific: honorificForName(request.customerName),
                  name: request.customerName,
                  when: request.proposedSlotStart,
                  remainingToman: money.remaining,
                }),
              );
            }
            return (
              <article key={request.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#2f80ed] text-xs font-bold text-white">{when || "—"}</span>
                  <div className="min-w-0">
                    <strong>{request.customerName}</strong>
                    <p className="text-sm text-muted" dir="ltr">{request.customerPhone}</p>
                    <p className="text-sm text-muted">{request.placement}{request.style ? ` · ${request.style}` : ""}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p className="rounded-2xl bg-[#e8f6ee] px-3 py-2 font-bold text-[#1f8a4c]">واریزی {formatTattooToman(money.paid)}</p>
                  <p className="rounded-2xl bg-[#fde8e8] px-3 py-2 font-bold text-[#eb5757]">مانده {formatTattooToman(money.remaining)}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button type="button" className="h-11" onClick={() => remind()}>یادآوری</Button>
                  <Button type="button" variant="outline" className="h-11" onClick={() => send(depositCardSms(request.customerName))}>کارت و شبا</Button>
                  <Button type="button" variant="outline" className="col-span-2 h-11" onClick={() => send(aftercareGuideSms(request.customerName))}>مراقبت بعد تاتو</Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      ) : null}
    </div>
  );
}
