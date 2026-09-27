import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { JalaliDatePicker } from "@/components/calendar/jalali-date-picker";
import { DurationFields, formatSitting } from "@/components/studio/duration-fields";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { compressImage } from "@/lib/design-images";
import { parseToman, toSmsLink, toTelLink } from "@/lib/format";
import { tehranDayKey, tehranLocalToIso } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import { fillInMissedCallSms, fillInRegisteredSms, formatGroupedDigits, formatTattooToman } from "@/lib/tattoo-flow";
import type { Booking } from "@/lib/types";

type StudioFillIn = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerPhone2: string;
  idea: string;
  placement: string;
  sizeCm: string;
  note: string;
  priceToman: number;
  designImage: string;
  sessionMinutes: number;
  callCount: number;
  cameCount: number;
  missedCount: number;
  ongoing: boolean;
  status: "waiting" | "filled" | "dropped";
};

export function StudioFillInBoard({ bookings, onPlaced }: { bookings: Booking[]; onPlaced: () => void }) {
  const [rows, setRows] = useState<StudioFillIn[]>([]);
  const [name, setName] = useState("");
  const [honorific, setHonorific] = useState<"آقای" | "خانم" | "">("آقای");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [note, setNote] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [ongoing, setOngoing] = useState(false);
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [placing, setPlacing] = useState<string | null>(null);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("12:00");
  const bookedKeys = useMemo(
    () => bookings.filter((booking) => booking.status !== "cancelled").map((booking) => tehranDayKey(new Date(booking.slotStart))),
    [bookings],
  );

  async function load() {
    const next = await saveAction<StudioFillIn[]>("listStudioFillIns");
    setRows(next);
  }

  useEffect(() => {
    void load().catch((err) => toast.error(friendlyError(err)));
  }, []);

  function openPlace(id: string) {
    setPlacing(id);
    setDay(tehranDayKey());
    setTime("12:00");
  }

  async function add() {
    setBusy(true);
    try {
      const spoken = name.trim();
      const customerName = honorific && spoken && !spoken.startsWith(honorific) ? `${honorific} ${spoken}` : spoken;
      if (minutes < 30) throw new Error("مدت تقریبی اجرا را بنویس. حداقل نیم ساعت.");
      await saveAction("addStudioFillIn", {
        customerName,
        customerPhone: phone,
        customerPhone2: phone2,
        idea: note.trim() || (image ? "طرح آپلود شده" : ""),
        note,
        sizeCm,
        priceToman: parseToman(price),
        designImage: image || undefined,
        sessionMinutes: minutes,
        ongoing,
      });
      setName("");
      setPhone("");
      setPhone2("");
      setNote("");
      setSizeCm("");
      setPrice("");
      setMinutes(0);
      setOngoing(false);
      setImage("");
      toast.success("در لیست پر کردن کنسلی ذخیره شد.");
      await load();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function place(row: StudioFillIn) {
    setBusy(true);
    try {
      const [y, m, d] = day.split("-").map(Number);
      const [hh, mm] = time.split(":").map(Number);
      if (!y || !m || !d || Number.isNaN(hh)) throw new Error("روز و ساعت را انتخاب کن.");
      if (!row.sessionMinutes || row.sessionMinutes < 30) throw new Error("اول مدت تقریبی اجرا را ذخیره کن.");
      await saveAction("createStudioJob", {
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        customerPhone2: row.customerPhone2 || undefined,
        style: "سایر",
        idea: row.note || row.idea || "پر کردن کنسلی",
        placement: row.placement || "هماهنگ در استودیو",
        sizeCm: row.sizeCm || undefined,
        priceMinToman: row.priceToman || 0,
        paidToman: 0,
        sessionMinutes: row.sessionMinutes,
        slotStart: tehranLocalToIso(y, m, d, hh || 12, mm || 0),
        referenceImages: row.designImage ? [row.designImage] : [],
      });
      await saveAction("markStudioFillIn", { id: row.id, mark: "came" });
      setPlacing(null);
      toast.success(row.ongoing ? "به نوبت امروز رفت و در لیست انتظار ماند." : "به نوبت امروز رفت و از لیست انتظار خارج شد.");
      await load();
      onPlaced();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const waiting = rows.filter((row) => row.status === "waiting");

  return (
    <div className="mt-5 grid gap-4">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-bold">لیست انتظار</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          کسانی که می‌خواهند زودتر بیایند. تا روز اجرا پولی نمی‌گیرند. اگر جا خالی شد، پیام بفرست و همان روز یا این هفته به تقویم اضافه‌شان کن.
        </p>
        <div className="mt-4 grid gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام" className="h-12" />
          <div className="grid grid-cols-3 gap-2">
            {(["آقای", "خانم", ""] as const).map((item) => (
              <button
                key={item || "none"}
                type="button"
                className={`h-11 rounded-xl border text-sm font-bold ${honorific === item ? "border-primary bg-primary text-primary-fg" : "border-border"}`}
                onClick={() => setHonorific(item)}
              >
                {item || "بدون پیشوند"}
              </button>
            ))}
          </div>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="شماره موبایل" inputMode="tel" dir="ltr" className="h-12" />
          <Input value={phone2} onChange={(e) => setPhone2(e.target.value)} placeholder="شماره دوم، اختیاری" inputMode="tel" dir="ltr" className="h-12" />
          <div>
            <p className="text-sm font-semibold">{ongoing ? "مدت هر تکه" : "مدت تقریبی اجرا"}</p>
            <div className="mt-2">
              <DurationFields minutes={minutes} onChange={setMinutes} />
            </div>
          </div>
          <label className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border text-sm font-bold">
            {image ? "طرح انتخاب شد · تغییر" : "آپلود طرح از گالری، اختیاری"}
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void compressImage(file).then(setImage).catch((err) => toast.error(friendlyError(err)));
              }}
            />
          </label>
          {image ? <img src={image} alt="" className="mx-auto max-h-36 rounded-xl object-contain" /> : null}
          <Input value={sizeCm} onChange={(e) => setSizeCm(e.target.value)} placeholder="ابعاد، مثلاً ۲۰ × ۱۲" className="h-12" />
          <Input
            value={price}
            onChange={(e) => setPrice(formatGroupedDigits(e.target.value))}
            inputMode="numeric"
            dir="ltr"
            placeholder="قیمت طرح"
            className="h-12"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`h-11 rounded-xl border text-sm font-bold ${!ongoing ? "border-primary bg-primary text-primary-fg" : "border-border"}`}
              onClick={() => setOngoing(false)}
            >
              یک جلسه
            </button>
            <button
              type="button"
              className={`h-11 rounded-xl border text-sm font-bold ${ongoing ? "border-primary bg-primary text-primary-fg" : "border-border"}`}
              onClick={() => setOngoing(true)}
            >
              ادامه دارد
            </button>
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت، اختیاری" rows={2} />
          <Button className="h-12" disabled={busy} onClick={() => void add()}>
            ذخیره در لیست انتظار
          </Button>
        </div>
      </section>

      {!waiting.length ? <p className="text-sm text-muted">هنوز کسی در لیست انتظار کنسلی نیست.</p> : null}
      {waiting.map((row) => {
        const registered = toSmsLink(row.customerPhone, fillInRegisteredSms(row.customerName));
        const tel = toTelLink(row.customerPhone);
        const tel2 = toTelLink(row.customerPhone2);
        const missedSms = toSmsLink(row.customerPhone, fillInMissedCallSms(row.customerName));
        return (
          <article key={row.id} className="rounded-2xl border border-border p-4">
            <strong>{row.customerName}</strong>
            <p className="mt-1 text-xs font-semibold text-accent">{row.ongoing ? "ادامه دارد · بعد از تأیید در لیست می‌ماند" : "یک جلسه · بعد از تأیید از لیست می‌رود"}</p>
            <p className="mt-1 text-sm" dir="ltr">{row.customerPhone}</p>
            {row.customerPhone2 ? <p className="text-sm text-muted" dir="ltr">دوم: {row.customerPhone2}</p> : null}
            <p className="mt-2 text-sm">
              تماس {toFaCount(row.callCount)} · آمد {toFaCount(row.cameCount)} · مراجعه نکرد {toFaCount(row.missedCount)}
            </p>
            {row.designImage ? <img src={row.designImage} alt="" className="mt-3 max-h-40 rounded-xl object-contain" /> : null}
            <p className="mt-2 text-sm text-muted">
              {row.sessionMinutes ? formatSitting(row.sessionMinutes) : "مدت اجرا ذخیره نشده"}
              {row.sizeCm ? ` · ابعاد ${row.sizeCm}` : ""}
              {row.priceToman ? ` · ${formatTattooToman(row.priceToman)}` : ""}
            </p>
            <WaitMinutes row={row} onSaved={() => void load()} />
            {row.note ? <p className="mt-1 text-sm leading-7">{row.note}</p> : null}
            <div className="mt-3 grid gap-2">
              {registered ? (
                <a className="inline-flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold" href={registered}>
                  پیام ثبت در لیست
                </a>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {tel ? (
                  <a
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold"
                    href={tel}
                    onClick={() => void saveAction("markStudioFillIn", { id: row.id, mark: "called" }).then(load).catch(() => undefined)}
                  >
                    تماس
                  </a>
                ) : null}
                {tel2 ? (
                  <a className="inline-flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold" href={tel2}>
                    تماس شماره دوم
                  </a>
                ) : null}
                {missedSms ? (
                  <a className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-fg" href={missedSms}>
                    پیام بی‌جواب
                  </a>
                ) : null}
              </div>
            </div>
            {placing === row.id ? (
              <div className="mt-3 grid gap-2">
                <JalaliDatePicker value={day} onChange={setDay} label="روز جا خالی" busyKeys={bookedKeys} />
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12" />
                <Button className="h-12" disabled={busy} onClick={() => void place(row)}>
                  تأیید شد، برو به نوبت این روز
                </Button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button className="h-11" onClick={() => openPlace(row.id)}>
                  تأیید و انتقال به نوبت
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={busy}
                  onClick={() =>
                    void saveAction("markStudioFillIn", { id: row.id, mark: "missed" })
                      .then(() => {
                        toast.success("مراجعه نکرد. در لیست انتظار ماند.");
                        return load();
                      })
                      .catch((err) => toast.error(friendlyError(err)))
                  }
                >
                  مراجعه نکرد
                </Button>
                <Button
                  variant="outline"
                  className="col-span-2 h-11 text-muted"
                  disabled={busy}
                  onClick={() =>
                    void saveAction("setStudioFillIn", { id: row.id, status: "dropped" })
                      .then(load)
                      .catch((err) => toast.error(friendlyError(err)))
                  }
                >
                  حذف از لیست
                </Button>
                <Button
                  variant="outline"
                  className="col-span-2 h-11"
                  disabled={busy}
                  onClick={() =>
                    void saveAction("setStudioFillInPlan", { id: row.id, ongoing: !row.ongoing })
                      .then(load)
                      .catch((err) => toast.error(friendlyError(err)))
                  }
                >
                  {row.ongoing ? "تغییر به یک جلسه" : "تغییر به ادامه دارد"}
                </Button>
                {row.ongoing ? (
                  <Button
                    variant="outline"
                    className="col-span-2 h-11"
                    disabled={busy}
                    onClick={() =>
                      void saveAction("setStudioFillIn", { id: row.id, status: "filled" })
                        .then(() => {
                          toast.success("کارش تمام شد و از لیست انتظار خارج شد.");
                          return load();
                        })
                        .catch((err) => toast.error(friendlyError(err)))
                    }
                  >
                    کار تمام شد
                  </Button>
                ) : null}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function toFaCount(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value || 0);
}

function WaitMinutes({ row, onSaved }: { row: StudioFillIn; onSaved: () => void }) {
  const [minutes, setMinutes] = useState(row.sessionMinutes || 0);
  const [busy, setBusy] = useState(false);
  if (row.sessionMinutes >= 30) return null;
  async function save() {
    if (minutes < 30) return toast.error("حداقل نیم ساعت بنویس.");
    setBusy(true);
    try {
      await saveAction("setStudioFillInMinutes", { id: row.id, sessionMinutes: minutes });
      toast.success("مدت اجرا ذخیره شد.");
      onSaved();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3">
      <p className="text-xs leading-6 text-muted">بدون مدت، در پیشنهاد روز نمی‌آید.</p>
      <DurationFields minutes={minutes} onChange={setMinutes} />
      <Button className="mt-2 h-11" variant="outline" disabled={busy} onClick={() => void save()}>
        ذخیره مدت
      </Button>
    </div>
  );
}
