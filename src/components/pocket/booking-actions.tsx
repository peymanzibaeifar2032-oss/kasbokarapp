import { MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toFaDigits } from "@/lib/calendar/jalali";
import { instagramProfileUrl, toSmsLink, toTelLink, toWhatsAppLink } from "@/lib/format";
import { plainSmsLink, studioPanelUrl, usablePhone } from "@/lib/pocket/booking-links";
import {
  aftercareGuideSms,
  balanceSms,
  bookingConfirmSms,
  depositCardSms,
  honorificForName,
  prepBeforeTattooSms,
  sessionFoodSms,
  tattooBalance,
} from "@/lib/tattoo-flow";
import type { PocketBooking } from "@/lib/pocket-book";
import type { PocketLocale } from "@/lib/pocket/professions";

export { studioPanelUrl, usablePhone, plainSmsLink };

type SmsKind = "confirm" | "card" | "balance" | "prep" | "food" | "care";

export function tattooSmsText(row: PocketBooking, kind: SmsKind) {
  const server = row.server;
  const paid = server && server.paidToman > 0 ? server.paidToman : server?.depositToman ?? 0;
  switch (kind) {
    case "confirm":
      return bookingConfirmSms({
        honorific: honorificForName(row.name),
        name: row.name,
        when: server?.slotStart || null,
        paidToman: paid,
      });
    case "card":
      return depositCardSms(row.name);
    case "balance":
      return balanceSms(row.name, server?.priceMinToman ?? 0, server?.paidToman ?? 0);
    case "prep":
      return prepBeforeTattooSms(row.name);
    case "food":
      return sessionFoodSms(row.name);
    case "care":
      return aftercareGuideSms(row.name);
  }
}

const SMS_LABELS: Record<SmsKind, string> = {
  confirm: "پیامک قطعی نوبت",
  card: "پیامک شماره کارت",
  balance: "پیامک مانده حساب",
  prep: "آماده‌سازی قبل تاتو",
  food: "خوراکی حین کار",
  care: "مراقبت بعد تاتو",
};

function money(n: number, locale: PocketLocale) {
  const f = new Intl.NumberFormat("en-US").format(Math.round(n || 0));
  return locale === "en" ? `${f} toman` : `${toFaDigits(f)} تومان`;
}

const TYPE_LABEL: Record<string, string> = {
  new: "طرح جدید",
  coverup: "کاور آپ",
  consultation: "مشاوره",
  custom: "سفارشی",
  repair: "ترمیم",
  continuation: "ادامهٔ کار",
};

/**
 * Per-appointment actions. Links are ordinary anchors: tel:/sms: open the phone's own dialer/SMS app
 * (the user presses call/send there), https links open the real site routes. No native URL bridge.
 */
export function PocketBookingActions({
  row,
  locale,
  ownerVerified,
}: {
  row: PocketBooking;
  locale: PocketLocale;
  ownerVerified: boolean;
}) {
  const [smsOpen, setSmsOpen] = useState(false);
  const en = locale === "en";
  const phones = [usablePhone(row.phone), usablePhone(row.server?.phone2)].filter(Boolean);
  const server = row.server;
  const fromSite = Boolean(row.serverId && server);
  const insta = server?.instagram ? instagramProfileUrl(server.instagram) : null;
  const balance = server ? tattooBalance(server.priceMinToman, server.paidToman) : null;

  function sendTemplate(phone: string, kind: SmsKind) {
    if (kind === "confirm" && !server?.slotStart) {
      toast.error("اول تاریخ و ساعت اجرا در سایت ثبت شود، بعد پیامک قطعی را بفرست.");
      return;
    }
    const href = toSmsLink(phone, tattooSmsText(row, kind));
    if (!href) {
      toast.error("شماره برای پیامک معتبر نیست.");
      return;
    }
    window.location.assign(href);
  }

  return (
    <div className="pocket-actions" data-testid="booking-actions">
      {fromSite && server ? (
        <dl className="pocket-facts">
          {server.phone2 ? (
            <>
              <dt>{en ? "Phone 2" : "شمارهٔ دوم"}</dt>
              <dd dir="ltr">{server.phone2}</dd>
            </>
          ) : null}
          {server.sizeCm ? (
            <>
              <dt>{en ? "Size" : "سایز"}</dt>
              <dd>{server.sizeCm}</dd>
            </>
          ) : null}
          {server.requestType ? (
            <>
              <dt>{en ? "Type" : "نوع کار"}</dt>
              <dd>{TYPE_LABEL[server.requestType] || server.requestType}</dd>
            </>
          ) : null}
          {server.priceMinToman ? (
            <>
              <dt>{en ? "Price" : "قیمت"}</dt>
              <dd>
                {money(server.priceMinToman, locale)}
                {server.priceMaxToman > server.priceMinToman ? ` – ${money(server.priceMaxToman, locale)}` : ""}
              </dd>
            </>
          ) : null}
          {server.depositToman ? (
            <>
              <dt>{en ? "Deposit" : "بیعانه"}</dt>
              <dd>{money(server.depositToman, locale)}</dd>
            </>
          ) : null}
          {balance && (balance.total || balance.paid) ? (
            <>
              <dt>{en ? "Paid / left" : "واریزی / مانده"}</dt>
              <dd>
                {money(balance.paid, locale)} / {money(balance.remaining, locale)}
              </dd>
            </>
          ) : null}
          {server.sessionCount ? (
            <>
              <dt>{en ? "Sessions" : "جلسه‌ها"}</dt>
              <dd>
                {en ? server.sessionCount : toFaDigits(server.sessionCount)}
                {server.sessionMinutes ? ` × ${en ? server.sessionMinutes : toFaDigits(server.sessionMinutes)} ${en ? "min" : "دقیقه"}` : ""}
              </dd>
            </>
          ) : null}
          {server.idea ? (
            <>
              <dt>{en ? "Idea" : "ایده"}</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>{server.idea}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      <div className="pocket-action-row">
        {phones.map((phone, index) => {
          const tel = toTelLink(phone);
          const sms = plainSmsLink(phone);
          const suffix = phones.length > 1 ? ` ${en ? index + 1 : toFaDigits(index + 1)}` : "";
          return (
            <span key={phone} className="contents">
              {tel ? (
                <a className="pocket-btn pocket-btn-call" href={tel} data-action="call">
                  <Phone size={16} aria-hidden /> {en ? "Call" : "تماس"}
                  {suffix}
                </a>
              ) : null}
              {sms ? (
                <a className="pocket-btn pocket-btn-sms" href={sms} data-action="sms">
                  <MessageSquare size={16} aria-hidden /> {en ? "SMS" : "پیامک"}
                  {suffix}
                </a>
              ) : null}
            </span>
          );
        })}
        {phones[0] && toWhatsAppLink(phones[0]) ? (
          <a className="pocket-btn pocket-btn-wa" href={toWhatsAppLink(phones[0])!} data-action="whatsapp" target="_blank" rel="noopener noreferrer">
            {en ? "WhatsApp" : "واتساپ"}
          </a>
        ) : null}
        {insta ? (
          <a className="pocket-btn pocket-btn-ghost" href={insta} target="_blank" rel="noopener noreferrer" data-action="instagram">
            {en ? "Instagram" : "اینستاگرام"}
          </a>
        ) : null}
      </div>
      {fromSite && phones.length ? (
        <div>
          <button type="button" className="pocket-btn pocket-btn-ghost" onClick={() => setSmsOpen((v) => !v)} aria-expanded={smsOpen}>
            {smsOpen ? "بستن پیامک‌های آماده" : "پیامک‌های آماده (مثل پنل سایت)"}
          </button>
          {smsOpen ? (
            <div className="pocket-action-row" style={{ marginTop: "0.5rem" }}>
              {(Object.keys(SMS_LABELS) as SmsKind[]).map((kind) => (
                <button key={kind} type="button" className="pocket-btn pocket-btn-sms" data-sms={kind} onClick={() => sendTemplate(phones[0], kind)}>
                  {SMS_LABELS[kind]}
                </button>
              ))}
              <p className="pocket-muted" style={{ fontSize: "0.75rem", width: "100%" }}>
                متن در برنامهٔ پیامک گوشی باز می‌شود؛ ارسال را خودت می‌زنی.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
      {fromSite && ownerVerified ? (
        <div className="pocket-action-row">
          <a className="pocket-btn pocket-btn-ghost" href={studioPanelUrl("requests")} data-action="panel" target="_blank" rel="noopener noreferrer">
            {en ? "Open in site panel" : "پنل سایت: درخواست‌ها"}
          </a>
          <a className="pocket-btn pocket-btn-ghost" href={studioPanelUrl("messages")} data-action="messages" target="_blank" rel="noopener noreferrer">
            {en ? "Site messages" : "پیام‌های مشتری در سایت"}
          </a>
          <a className="pocket-btn pocket-btn-ghost" href={studioPanelUrl("jobs")} data-action="jobs" target="_blank" rel="noopener noreferrer">
            {en ? "Edit job on site" : "ویرایش کار در سایت"}
          </a>
          <p className="pocket-muted" style={{ fontSize: "0.75rem", width: "100%" }}>
            پنل سایت هنوز پیوند مستقیم به یک درخواست ندارد؛ در تب باز شده، اسم «{row.name}» را پیدا کن. ورود در مرورگر لازم است.
          </p>
        </div>
      ) : null}
    </div>
  );
}
