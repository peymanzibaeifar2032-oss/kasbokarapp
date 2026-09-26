import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { JalaliDatePicker } from "@/components/calendar/jalali-date-picker";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { compressImage } from "@/lib/design-images";
import { parseToman, toSmsLink, toTelLink } from "@/lib/format";
import { firstOpenCustomerDay, tehranDayKey, tehranLocalToIso } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import { thursdayBusyKeys } from "@/lib/studio-apprentices";
import { fillInOfferSms, fillInRegisteredSms, formatGroupedDigits, formatTattooToman } from "@/lib/tattoo-flow";
import type { Booking } from "@/lib/types";

type StudioFillIn = {
  id: string;
  customerName: string;
  customerPhone: string;
  idea: string;
  placement: string;
  sizeCm: string;
  note: string;
  priceToman: number;
  designImage: string;
  status: "waiting" | "filled" | "dropped";
};

export function StudioFillInBoard({ bookings, onPlaced }: { bookings: Booking[]; onPlaced: () => void }) {
  const [rows, setRows] = useState<StudioFillIn[]>([]);
  const [name, setName] = useState("");
  const [honorific, setHonorific] = useState<"آقای" | "خانم" | "">("آقای");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [price, setPrice] = useState("");
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
    setDay(firstOpenCustomerDay(bookedKeys, thursdayBusyKeys()));
    setTime("12:00");
  }

  async function add() {
    setBusy(true);
    try {
      const spoken = name.trim();
      const customerName = honorific && spoken && !spoken.startsWith(honorific) ? `${honorific} ${spoken}` : spoken;
      await saveAction("addStudioFillIn", {
        customerName,
        customerPhone: phone,
        idea: note.trim() || (image ? "طرح آپلود شده" : ""),
        note,
        sizeCm,
        priceToman: parseToman(price),
        designImage: image || undefined,
      });
      setName("");
      setPhone("");
      setNote("");
      setSizeCm("");
      setPrice("");
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
      await saveAction("createStudioJob", {
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        style: "سایر",
        idea: row.note || row.idea || "پر کردن کنسلی",
        placement: row.placement || "هماهنگ در استودیو",
        sizeCm: row.sizeCm || undefined,
        priceMinToman: row.priceToman || 0,
        paidToman: 0,
        sessionMinutes: 180,
        slotStart: tehranLocalToIso(y, m, d, hh || 12, mm || 0),
        referenceImages: row.designImage ? [row.designImage] : [],
      });
      await saveAction("setStudioFillIn", { id: row.id, status: "filled" });
      setPlacing(null);
      toast.success("به تقویم اضافه شد. هزینه را همان روز با کارت‌خوان می‌گیری.");
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
        <h2 className="font-bold">لیست پر کردن کنسلی</h2>
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
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت، اختیاری" rows={2} />
          <Button className="h-12" disabled={busy} onClick={() => void add()}>
            ذخیره در لیست پر کردن کنسلی
          </Button>
        </div>
      </section>

      {!waiting.length ? <p className="text-sm text-muted">هنوز کسی در لیست انتظار کنسلی نیست.</p> : null}
      {waiting.map((row) => {
        const registered = toSmsLink(row.customerPhone, fillInRegisteredSms(row.customerName));
        const sms = toSmsLink(
          row.customerPhone,
          fillInOfferSms(row.customerName, row.note || (row.idea === "طرح آپلود شده" ? "" : row.idea), row.priceToman),
        );
        const tel = toTelLink(row.customerPhone);
        return (
          <article key={row.id} className="rounded-2xl border border-border p-4">
            <strong>{row.customerName}</strong>
            <p className="mt-1 text-sm" dir="ltr">{row.customerPhone}</p>
            {row.designImage ? <img src={row.designImage} alt="" className="mt-3 max-h-40 rounded-xl object-contain" /> : null}
            <p className="mt-2 text-sm text-muted">
              {row.sizeCm ? `ابعاد ${row.sizeCm}` : "ابعاد ثبت نشده"}
              {row.priceToman ? ` · ${formatTattooToman(row.priceToman)}` : ""}
            </p>
            {row.note ? <p className="mt-1 text-sm leading-7">{row.note}</p> : null}
            <div className="mt-3 grid gap-2">
              {registered ? (
                <a className="inline-flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold" href={registered}>
                  پیام ثبت در لیست
                </a>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {tel ? (
                  <a className="inline-flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold" href={tel}>
                    تماس
                  </a>
                ) : null}
                {sms ? (
                  <a className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-fg" href={sms}>
                    پیام جا خالی
                  </a>
                ) : null}
              </div>
            </div>
            {placing === row.id ? (
              <div className="mt-3 grid gap-2">
                <JalaliDatePicker value={day} onChange={setDay} label="روز جا خالی" busyKeys={bookedKeys} />
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12" />
                <Button className="h-12" disabled={busy} onClick={() => void place(row)}>
                  افزودن به تقویم
                </Button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button className="h-11" onClick={() => openPlace(row.id)}>
                  افزودن به تقویم
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={busy}
                  onClick={() =>
                    void saveAction("setStudioFillIn", { id: row.id, status: "dropped" })
                      .then(load)
                      .catch((err) => toast.error(friendlyError(err)))
                  }
                >
                  حذف از لیست
                </Button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
