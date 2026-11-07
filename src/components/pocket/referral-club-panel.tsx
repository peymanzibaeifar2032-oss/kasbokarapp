import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { clubMemberSms, FALLBACK_CLUB_SMS, type ReferralSmsSettings } from "@/lib/referral-sms";
import { effectiveClubSettings, readReferralState, validateClubSettings, writeReferralState, type PocketReferralState } from "@/lib/pocket/referral-club";
import { isLicenseLockedError } from "@/lib/pocket/license-gate";
import { studioPanelUrl, usablePhone } from "@/lib/pocket/booking-links";
import { toFaDigits } from "@/lib/calendar/jalali";
import { SmsComposer } from "./sms-composer";

const FIELDS: [keyof ReferralSmsSettings, string][] = [
  ["prize5", "جایزه ۵ معرفی"],
  ["prize10", "جایزه ۱۰ معرفی"],
  ["smsSubmitted", "پیام بررسی"],
  ["smsPriced", "پیام قیمت"],
  ["smsBooked", "پیام معرفی موفق"],
  ["smsPrize5", "پیام جایزه ۵"],
  ["smsPrize10", "پیام جایزه ۱۰"],
];

/** Referral-club SMS, same six texts as the site's club panel. Data only from the owner-verified site load. */
export function ReferralClubPanel({ revision, onChanged }: { revision: number; onChanged: () => void }) {
  const [state, setState] = useState<PocketReferralState>({ club: null, localSettings: null });
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ReferralSmsSettings>(FALLBACK_CLUB_SMS);
  useEffect(() => setState(readReferralState()), [revision]);
  const eff = effectiveClubSettings(state);
  const members = useMemo(() => {
    const q = query.trim();
    const list = state.club?.members ?? [];
    return q ? list.filter((m) => m.name.includes(q) || m.code.toUpperCase().includes(q.toUpperCase()) || m.phone.includes(q)) : list;
  }, [state, query]);

  function save(next: ReferralSmsSettings | null) {
    if (next) {
      const err = validateClubSettings(next);
      if (err) return toast.error(err);
    }
    try {
      writeReferralState({ ...state, localSettings: next ? Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v.trim()])) as ReferralSmsSettings : null });
      setEditing(false);
      onChanged();
      toast.success(next ? "متن‌ها روی این گوشی ذخیره شد." : "متن‌های سایت دوباره استفاده می‌شود.");
    } catch (error) {
      toast.error(isLicenseLockedError(error) ? error.message : "ذخیره نشد؛ متن قبلی حفظ شد.");
    }
  }

  return (
    <section className="pocket-panel pocket-club" data-testid="club-panel" aria-labelledby="pocket-club-title">
      <h2 id="pocket-club-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900 }}>باشگاه مشتریان (پیامک‌های معرفی)</h2>
      {!state.club ? (
        <p className="pocket-muted" data-testid="club-needs-site">
          اعضای باشگاه، کد عضویت و تعداد معرفی‌ها فقط در سایت ساخته می‌شوند. برای دیدن پیامک‌ها، صاحب استودیو با حساب خودش
          وارد شود و «دانلود نوبت‌ها / بارگذاری همه از سایت» را بزند (اینترنت لازم است). بدون آن، پیامکی با کد ساختگی نشان داده نمی‌شود.
        </p>
      ) : (
        <>
          <p className="pocket-muted">
            {toFaDigits(state.club.members.length)} عضو · آخرین دریافت از سایت: {toFaDigits(state.club.generatedAt.slice(0, 10))} · متن پیامک‌ها:{" "}
            {eff.source === "phone" ? "ویرایش روی این گوشی" : eff.source === "site" ? "تنظیمات سایت" : "پیش‌فرض سایت"}
          </p>
          <input aria-label="جستجوی عضو" placeholder="جستجو با نام، کد یا شماره" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className="pocket-tx-list" data-testid="club-members">
            {members.map((m) => {
              const phone = usablePhone(m.phone);
              return (
                <li key={m.id} className="pocket-tx">
                  <button type="button" className="pocket-club-member" aria-expanded={openId === m.id} onClick={() => setOpenId(openId === m.id ? null : m.id)} data-testid="club-member">
                    <strong>{m.name}</strong>
                    <span dir="ltr">{m.code}</span>
                    <span className="pocket-muted">{toFaDigits(m.successful)} معرفی موفق از {toFaDigits(m.total)}{m.active ? "" : " · غیرفعال"}</span>
                  </button>
                  {openId === m.id ? (
                    phone ? (
                      <SmsComposer
                        phones={[phone]}
                        choices={clubMemberSms(m, m.successful, m.rewards, eff.settings).map((r) => ({ kind: r.kind, label: r.label, group: "باشگاه مشتریان" }))}
                        build={(kind) => clubMemberSms(m, m.successful, m.rewards, eff.settings).find((r) => r.kind === kind)?.body ?? ""}
                        testId="club-sms"
                      />
                    ) : (
                      <p className="pocket-muted">شمارهٔ این عضو برای پیامک معتبر نیست.</p>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
          {state.club.outbox.length ? (
            <div data-testid="club-outbox">
              <h3 className="pocket-list-title">پیامک‌های آمادهٔ سایت (مرحله‌ای)</h3>
              <p className="pocket-muted">این متن‌ها را سایت ساخته است. باز کردن پیامک از اینجا آن را در سایت «ارسال‌شده» علامت نمی‌زند؛ علامت‌گذاری فقط در پنل سایت انجام می‌شود.</p>
              <ul className="pocket-tx-list">
                {state.club.outbox.map((o) => {
                  const phone = usablePhone(o.phone);
                  return (
                    <li key={o.id} className="pocket-tx">
                      {phone ? <SmsComposer phones={[phone]} choices={[{ kind: o.id, label: "پیامک آماده" }]} build={() => o.body} testId="club-outbox-sms" /> : <p>{o.body}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <a className="pocket-btn" href={studioPanelUrl("club")} target="_blank" rel="noreferrer">مدیریت اعضا و ذخیرهٔ متن در پنل سایت (اینترنت و ورود لازم است)</a>
        </>
      )}
      <button type="button" className="pocket-btn" data-testid="club-settings-toggle" onClick={() => { setDraft(eff.settings); setEditing((v) => !v); }}>
        {editing ? "بستن تنظیمات" : "متن جایزه و پیامک"}
      </button>
      {editing ? (
        <div className="pocket-sms" data-testid="club-settings">
          {FIELDS.map(([k, label]) => (
            <label key={k} style={{ display: "grid", gap: ".2rem", fontWeight: 800, fontSize: ".85rem" }}>
              {label}
              <textarea rows={k.startsWith("prize") ? 1 : 3} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} data-field={k} />
            </label>
          ))}
          <p className="pocket-muted">در متن می‌توانی {"{code}"} برای کد عضویت، {"{count}"} برای تعداد و {"{prize}"} برای جایزه بگذاری. ذخیره فقط روی این گوشی است و در پشتیبان JSON می‌ماند؛ برای تغییر متن سایت، در پنل سایت ذخیره کن.</p>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <button type="button" className="pocket-btn pocket-pay-cta" onClick={() => save(draft)} data-testid="club-settings-save">ذخیره روی این گوشی</button>
            {state.localSettings ? <button type="button" className="pocket-btn" onClick={() => save(null)}>برگشت به متن سایت</button> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
