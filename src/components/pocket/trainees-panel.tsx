import { pocketAmountDigits } from "@/lib/pocket/numbers";
import { canRequestServerSync } from "@/lib/pocket/professions";
import { downloadPocketSnapshot } from "@/lib/pocket/sync";
import { currentBackup, commitBackup, mergeById } from "@/lib/pocket/backup";
import { isLicenseLockedError } from "@/lib/pocket/license-gate";
import { TRAINEE_SMS, traineeSmsText, type TraineeSmsKind } from "@/lib/pocket/sms-templates";
import { plainSmsLink, usablePhone } from "@/lib/pocket/booking-links";
import { toTelLink, toWhatsAppLink } from "@/lib/format";
import { SmsComposer } from "./sms-composer";
import { listPocketBookings } from "@/lib/pocket-book";
import { readPocketSettings } from "@/lib/pocket/settings";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CloudDownload, GraduationCap, MessageSquare, Minus, Phone, Plus, Trash2, UserPlus } from "lucide-react";
import { toFaDigits } from "@/lib/calendar/jalali";
import type { PocketLocale, ProfessionPack } from "@/lib/pocket/professions";
import { packText } from "@/lib/pocket/professions";
import {
  listTraineePayments,
  listTrainees,
  newTraineeId,
  newTraineePaymentId,
  saveTraineePayments,
  saveTrainees,
  traineeBalance,
  traineePaidAmount,
  traineeRemaining,
  type Trainee,
  type TraineePayment,
} from "@/lib/pocket/trainees";
import "./pocket.css";

type Props = { locale: PocketLocale; pack: ProfessionPack; todayKey: string; ownerVerified?: boolean; onSyncAll?: () => Promise<void> };

function tomanText(value: number, locale: PocketLocale) {
  const amount = Math.round(Number(value) || 0);
  const formatted = new Intl.NumberFormat("en-US").format(amount);
  const digits = locale === "en" ? formatted : toFaDigits(formatted);
  return locale === "en" ? `${digits} toman` : `${digits} تومان`;
}

export function PocketTraineesPanel({ locale, pack, todayKey, ownerVerified = false, onSyncAll }: Props) {
  const [pendingServer, setPendingServer] = useState<{
    trainees: Trainee[];
    traineePayments: TraineePayment[];
  } | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [replaceServer, setReplaceServer] = useState(false);
  const [people, setPeople] = useState<Trainee[]>([]);
  const [payments, setPayments] = useState<TraineePayment[]>([]);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [honorific, setHonorific] = useState(locale === "en" ? "Mr/Ms" : "آقا/خانم");
  const [sessionGoal, setSessionGoal] = useState("12");
  const [feeTotal, setFeeTotal] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    void Promise.all([listTrainees(), listTraineePayments()])
      .then(([nextPeople, nextPayments]) => {
        setPeople(nextPeople);
        setPayments(nextPayments);
      })
      .catch(() =>
        toast.error(locale === "en" ? "Trainee storage failed." : "حافظهٔ هنرجوها باز نشد."),
      )
      .finally(() => setReady(true));
  }, [locale]);

  const totals = useMemo(() => {
    const paid = people.reduce((sum, person) => sum + traineePaidAmount(person, payments), 0);
    const fee = people.reduce((sum, row) => sum + row.feeTotalToman, 0);
    return { paid, fee, remaining: fee - paid };
  }, [people, payments]);

  // Save first: a blocked (unlicensed) or failed write must never show as if it had been stored.
  async function persistPeople(next: Trainee[]) {
    await saveTrainees(next);
    setPeople(next);
  }
  async function persistPayments(next: TraineePayment[]) {
    await saveTraineePayments(next);
    setPayments(next);
  }

  async function addPerson() {
    const clean = name.trim();
    if (clean.length < 2) return toast.error(locale === "en" ? "Write the name." : "اسم را بنویس.");
    await persistPeople([
      ...people,
      {
        id: newTraineeId(),
        name: clean,
        phone: phone.trim(),
        honorific: honorific.trim() || (locale === "en" ? "Mr/Ms" : "آقا/خانم"),
        sessionGoal: Math.max(1, Number(pocketAmountDigits(sessionGoal)) || 12),
        sessionsDone: 0,
        feeTotalToman: Number(pocketAmountDigits(feeTotal)) || 0,
        paidToman: 0,
        notes: notes.trim(),
        startedOn: todayKey,
        createdAt: new Date().toISOString(),
      },
    ]);
    setName("");
    setPhone("");
    setFeeTotal("");
    setNotes("");
    toast.success(locale === "en" ? "Trainee added." : "هنرجو اضافه شد.");
  }

  async function bumpSessions(id: string, delta: number) {
    await persistPeople(
      people.map((row) =>
        row.id === id
          ? {
              ...row,
              sessionsDone: Math.max(0, Math.min(row.sessionGoal, row.sessionsDone + delta)),
            }
          : row,
      ),
    );
  }

  async function addPayment(traineeId: string, amountRaw: string) {
    const amount = Number(pocketAmountDigits(amountRaw)) || 0;
    if (amount <= 0)
      return toast.error(locale === "en" ? "Enter payment amount." : "مبلغ واریزی را بنویس.");
    const legacy = people.find((p) => p.id === traineeId);
    const opening =
      legacy && legacy.paidToman > 0 && !payments.some((p) => p.traineeId === traineeId)
        ? [
            {
              id: newTraineePaymentId(),
              traineeId,
              amountToman: legacy.paidToman,
              paidOn: todayKey,
              note: "مانده پرداخت ثبت‌شده قبلی",
            },
          ]
        : [];
    const nextPayments = [
      ...opening,
      { id: newTraineePaymentId(), traineeId, amountToman: amount, paidOn: todayKey, note: "" },
      ...payments,
    ];
    await persistPayments(nextPayments);
    await persistPeople(
      people.map((row) =>
        row.id === traineeId
          ? {
              ...row,
              paidToman: nextPayments
                .filter((p) => p.traineeId === traineeId)
                .reduce((sum, p) => sum + p.amountToman, 0),
            }
          : row,
      ),
    );
    toast.success(locale === "en" ? "Payment saved." : "واریزی ثبت شد.");
  }

  async function removePerson(id: string) {
    if (!window.confirm(locale === "en" ? "Delete this trainee?" : "این هنرجو حذف شود؟")) return;
    await persistPeople(people.filter((row) => row.id !== id));
    await persistPayments(payments.filter((row) => row.traineeId !== id));
  }

  async function fetchTrainees() {
    setSyncBusy(true);
    try {
      // One unified site load (appointments + trainees + cash) lives in the app shell.
      if (onSyncAll) {
        await onSyncAll();
        return;
      }
      const snapshot = await downloadPocketSnapshot();
      if (!snapshot.account?.isOwner)
        throw new Error("سرور این نشست را صاحب استودیو تشخیص نداد؛ چیزی تغییر نکرد.");
      if (!snapshot.training)
        throw new Error(
          "سرور فعلی هنوز خروجی هنرجوها ندارد. انتشار به‌روزرسانی سرور لازم است؛ داده گوشی دست نخورده است.",
        );
      setPendingServer(snapshot.training);
      setReplaceServer(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "دریافت هنرجوها انجام نشد.");
    } finally {
      setSyncBusy(false);
    }
  }
  return (
    <section className="grid gap-4">
      {canRequestServerSync(pack.id) && ownerVerified ? (
        <div className="pocket-card" style={{ padding: "1rem" }} data-testid="trainee-server-card">
          <button
            type="button"
            className="pocket-btn pocket-btn-primary"
            style={{ width: "100%", fontSize: "1.02rem" }}
            disabled={syncBusy}
            onClick={() => void fetchTrainees()}
          >
            <CloudDownload size={18} aria-hidden />
            {syncBusy ? "در حال بارگذاری…" : "بارگذاری همه از سایت (نوبت، هنرجو، صندوق)"}
          </button>
          <p className="pocket-muted">
            از جدول هنرجوهای پنل سایت خودت (پیشرفت جلسه‌ها، بدهی و واریزی‌ها). سرور قبل از ارسال، نشست صاحب استودیو را بررسی می‌کند؛ پیش‌نمایش را می‌بینی و بعد تأیید می‌کنی.
          </p>
          {pendingServer ? (
            <div className="pocket-import-review">
              <p>
                {pendingServer.trainees.length} هنرجو و {pendingServer.traineePayments.length}{" "}
                واریزی آماده ورود است. هیچ هنرجوی محلی حذف نمی‌شود.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={replaceServer}
                  onChange={(e) => setReplaceServer(e.target.checked)}
                />{" "}
                به‌روزرسانی موارد هم‌شناسه از سرور (ویرایش محلی جایگزین می‌شود)
              </label>
              <button
                type="button"
                className="pocket-btn pocket-btn-primary"
                disabled={syncBusy}
                onClick={() =>
                  void (async () => {
                    setSyncBusy(true);
                    try {
                      const before = await currentBackup(
                        await listPocketBookings(),
                        readPocketSettings(),
                      );
                      const next = {
                        ...before,
                        trainees: mergeById(before.trainees, pendingServer.trainees, replaceServer),
                        traineePayments: mergeById(
                          before.traineePayments,
                          pendingServer.traineePayments,
                          replaceServer,
                        ),
                      };
                      await commitBackup(next, before);
                      setPeople(next.trainees);
                      setPayments(next.traineePayments);
                      setPendingServer(null);
                      toast.success("هنرجوها و واریزی‌ها ذخیره شدند.");
                    } catch (error) {
                      toast.error(isLicenseLockedError(error) ? error.message : "ذخیره هنرجوها انجام نشد؛ اطلاعات قبلی محفوظ است.");
                    } finally {
                      setSyncBusy(false);
                    }
                  })()
                }
              >
                تأیید بارگذاری هنرجوها
              </button>
              <button
                type="button"
                className="pocket-btn pocket-btn-ghost"
                onClick={() => setPendingServer(null)}
              >
                لغو
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="pocket-section-hero is-trainee">
        <span className="pocket-section-icon" aria-hidden><GraduationCap size={22} /></span>
        <h2>{packText(pack, locale, "traineesLabelFa", "traineesLabelEn")}</h2>
      </div>
      <p className="pocket-muted" style={{ margin: 0 }}>
        {locale === "en"
          ? "Profiles, sessions, progress and payments stay offline on this phone."
          : "مشخصات، جلسات، پیشرفت و پرداخت‌ها به‌صورت آفلاین روی همین گوشی می‌مانند."}
      </p>
      <div className="pocket-stat-grid">
        <div className="pocket-stat is-trainee is-fee">
          <p>{locale === "en" ? "Fees" : "شهریه"}</p>
          <p>{tomanText(totals.fee, locale)}</p>
        </div>
        <div className="pocket-stat is-trainee is-paid">
          <p>{locale === "en" ? "Paid" : "پرداخت‌شده"}</p>
          <p>{tomanText(totals.paid, locale)}</p>
        </div>
        <div className="pocket-stat is-trainee is-left">
          <p>{locale === "en" ? "Remaining" : "مانده"}</p>
          <p>{tomanText(totals.remaining, locale)}</p>
        </div>
      </div>

      <button type="button" className="pocket-btn pocket-cta is-trainee" onClick={() => {
        const el = document.getElementById("pocket-trainee-name") as HTMLInputElement | null;
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        el?.focus();
      }}>
        <UserPlus size={20} aria-hidden /> {locale === "en" ? "Add a trainee" : "افزودن هنرجوی جدید"}
      </button>
      <form
        className="pocket-card pocket-form-card grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void addPerson();
        }}
      >
        <p style={{ margin: 0, fontWeight: 800 }}>
          {locale === "en" ? "New trainee" : "هنرجوی جدید"}
        </p>
        <input
          id="pocket-trainee-name"
          className="pocket-field"
          aria-label={locale === "en" ? "Name" : "نام"}
          placeholder={locale === "en" ? "Name" : "نام"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="pocket-field"
          placeholder={locale === "en" ? "Mobile" : "موبایل"}
          inputMode="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="pocket-field"
          placeholder={locale === "en" ? "Honorific" : "عنوان (آقا/خانم)"}
          value={honorific}
          onChange={(e) => setHonorific(e.target.value)}
        />
        <input
          className="pocket-field"
          placeholder={locale === "en" ? "Session goal" : "تعداد جلسات هدف"}
          inputMode="numeric"
          value={sessionGoal}
          onChange={(e) => setSessionGoal(pocketAmountDigits(e.target.value))}
        />
        <input
          className="pocket-field"
          placeholder={locale === "en" ? "Total fee (toman)" : "شهریه کل به تومان"}
          inputMode="numeric"
          value={feeTotal}
          onChange={(e) => setFeeTotal(pocketAmountDigits(e.target.value))}
        />
        <textarea
          className="pocket-area"
          placeholder={locale === "en" ? "Notes" : "یادداشت"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="submit" className="pocket-btn pocket-btn-primary">
          {locale === "en" ? "Add" : "افزودن"}
        </button>
      </form>

      {!ready ? (
        <p className="pocket-muted">{locale === "en" ? "Loading…" : "در حال خواندن…"}</p>
      ) : null}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.65rem" }}>
        {people.map((person) => {
          const paid = traineePaidAmount(person, payments);
          const remainingSessions = traineeRemaining(person.sessionsDone, person.sessionGoal);
          const balance = traineeBalance(person.feeTotalToman, paid);
          return (
            <li key={person.id} className="pocket-card">
              <p style={{ margin: 0, fontWeight: 900 }}>
                {person.honorific} {person.name}
              </p>
              <p className="pocket-muted" style={{ margin: "0.35rem 0 0" }}>
                {person.phone ? <span className="pocket-phone">{person.phone}</span> : "—"}
                {" · "}
                {(locale === "en" ? "sessions" : "جلسه") +
                  ` ${locale === "en" ? person.sessionsDone : toFaDigits(person.sessionsDone)}/${locale === "en" ? person.sessionGoal : toFaDigits(person.sessionGoal)}`}
                {" · "}
                {(locale === "en" ? "left" : "مانده") +
                  ` ${locale === "en" ? remainingSessions : toFaDigits(remainingSessions)}`}
                {" · "}
                <span className="pocket-price">{tomanText(balance, locale)}</span>
              </p>
              {person.notes ? (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem" }}>{person.notes}</p>
              ) : null}
              <TraineeContact person={person} />
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.75rem" }}
              >
                <button
                  type="button"
                  className="pocket-btn pocket-btn-ghost"
                  onClick={() => void bumpSessions(person.id, 1)}
                >
                  <Plus size={16} />
                  {locale === "en" ? "Session" : "جلسه"}
                </button>
                <button
                  type="button"
                  className="pocket-btn pocket-btn-ghost"
                  onClick={() => void bumpSessions(person.id, -1)}
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  className="pocket-btn pocket-btn-sms"
                  onClick={() => {
                    const amount = window.prompt(
                      locale === "en" ? "Payment amount (toman)" : "مبلغ واریزی به تومان",
                      "",
                    );
                    if (amount != null) void addPayment(person.id, amount);
                  }}
                >
                  {locale === "en" ? "Payment" : "واریزی"}
                </button>
                <button
                  type="button"
                  className="pocket-btn pocket-btn-danger"
                  onClick={() => void removePerson(person.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TraineeContact({ person }: { person: Trainee }) {
  const [open, setOpen] = useState(false);
  const phone = usablePhone(person.phone);
  if (!phone) return null;
  const tel = toTelLink(phone);
  const sms = plainSmsLink(phone);
  const wa = toWhatsAppLink(phone);
  return (
    <div className="pocket-actions" style={{ marginTop: "0.6rem" }}>
      <div className="pocket-action-row">
        {tel ? <a className="pocket-btn pocket-btn-call" href={tel} data-action="call"><Phone size={16} aria-hidden /> تماس</a> : null}
        {sms ? <a className="pocket-btn pocket-btn-sms" href={sms} data-action="sms"><MessageSquare size={16} aria-hidden /> پیامک</a> : null}
        {wa ? <a className="pocket-btn pocket-btn-wa" href={wa} data-action="whatsapp" target="_blank" rel="noopener noreferrer">واتساپ</a> : null}
        <button type="button" className="pocket-btn pocket-btn-ghost" aria-expanded={open} data-testid="trainee-sms-toggle" onClick={() => setOpen((v) => !v)}>
          <MessageSquare size={16} aria-hidden /> {open ? "بستن پیامک‌ها" : "پیامک‌های هنرجو (مثل سایت)"}
        </button>
      </div>
      {open ? (
        <SmsComposer phones={[phone]} choices={TRAINEE_SMS} build={(kind) => traineeSmsText(person, kind as TraineeSmsKind)} testId="trainee-sms" />
      ) : null}
    </div>
  );
}
