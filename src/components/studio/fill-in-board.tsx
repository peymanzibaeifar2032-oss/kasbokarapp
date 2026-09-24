import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { parseToman, toSmsLink, toTelLink } from "@/lib/format";
import { tehranClock, tehranLocalToIso } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import { fillInOfferSms, formatGroupedDigits } from "@/lib/tattoo-flow";

type StudioFillIn = {
  id: string;
  customerName: string;
  customerPhone: string;
  idea: string;
  placement: string;
  sizeCm: string;
  note: string;
  status: "waiting" | "filled" | "dropped";
};

function todaySlot(hour: number, minute: number) {
  const clock = tehranClock();
  return tehranLocalToIso(clock.y, clock.m, clock.day, hour, minute);
}

export function StudioFillInBoard({ onPlaced }: { onPlaced: () => void }) {
  const [rows, setRows] = useState<StudioFillIn[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [idea, setIdea] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [placing, setPlacing] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [hour, setHour] = useState(() => String(Math.min(20, tehranClock().hh + 1)).padStart(2, "0"));

  async function load() {
    const next = await saveAction<StudioFillIn[]>("listStudioFillIns");
    setRows(next);
  }

  useEffect(() => {
    void load().catch((err) => toast.error(friendlyError(err)));
  }, []);

  async function add() {
    setBusy(true);
    try {
      await saveAction("addStudioFillIn", { customerName: name, customerPhone: phone, idea, note });
      setName("");
      setPhone("");
      setIdea("");
      setNote("");
      toast.success("به لیست کنسلی اضافه شد. تا روز اجرا پولی نمی‌گیرد.");
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
      const hh = Number(hour);
      if (!Number.isInteger(hh) || hh < 8 || hh > 21) throw new Error("ساعت را بین ۸ تا ۲۱ بنویس.");
      await saveAction("createStudioJob", {
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        style: "سایر",
        idea: row.idea,
        placement: row.placement || "هماهنگ در استودیو",
        sizeCm: row.sizeCm || undefined,
        priceMinToman: parseToman(price),
        paidToman: 0,
        sessionMinutes: 180,
        slotStart: todaySlot(hh, 0),
      });
      await saveAction("setStudioFillIn", { id: row.id, status: "filled" });
      setPlacing(null);
      setPrice("");
      toast.success("برای امروز در تقویم نشست. هزینه را همان روز با کارت‌خوان می‌گیری.");
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
          کسانی که می‌خواهند زودتر بیایند. پولی نمی‌گیرند تا روز اجرا. اگر کسی کنسل کرد، از اینجا انتخاب‌شان کن؛ همان روز می‌آیند و هزینه را با کارت‌خوان می‌دهند.
        </p>
        <div className="mt-4 grid gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام" className="h-12" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="شماره موبایل" inputMode="tel" dir="ltr" className="h-12" />
          <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="طرحی که می‌خواهد" rows={3} />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت، اختیاری" className="h-12" />
          <Button className="h-12" disabled={busy} onClick={() => void add()}>افزودن به لیست</Button>
        </div>
      </section>

      {!waiting.length ? <p className="text-sm text-muted">هنوز کسی در لیست انتظار کنسلی نیست.</p> : null}
      {waiting.map((row) => {
        const sms = toSmsLink(row.customerPhone, fillInOfferSms(row.customerName, row.idea));
        const tel = toTelLink(row.customerPhone);
        return (
          <article key={row.id} className="rounded-2xl border border-border p-4">
            <strong>{row.customerName}</strong>
            <p className="mt-1 text-sm" dir="ltr">{row.customerPhone}</p>
            <p className="mt-2 text-sm leading-7">{row.idea}</p>
            {row.note ? <p className="mt-1 text-sm text-muted">{row.note}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {tel ? <a className="inline-flex h-11 items-center justify-center rounded-xl border border-border text-sm font-bold" href={tel}>تماس</a> : null}
              {sms ? <a className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-fg" href={sms}>پیام جا خالی شد</a> : null}
            </div>
            {placing === row.id ? (
              <div className="mt-3 grid gap-2">
                <label className="text-sm">
                  ساعت امروز
                  <Input value={hour} onChange={(e) => setHour(e.target.value)} inputMode="numeric" dir="ltr" className="mt-1 h-12" />
                </label>
                <label className="text-sm">
                  قیمت کل، اگر از قبل معلوم است
                  <Input
                    value={price}
                    onChange={(e) => setPrice(formatGroupedDigits(e.target.value))}
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="۰"
                    className="mt-1 h-12"
                  />
                </label>
                <Button className="h-12" disabled={busy} onClick={() => void place(row)}>ثبت برای امروز</Button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button className="h-11" onClick={() => setPlacing(row.id)}>همین امروز بگذار</Button>
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={busy}
                  onClick={() => void saveAction("setStudioFillIn", { id: row.id, status: "dropped" }).then(load).catch((err) => toast.error(friendlyError(err)))}
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
