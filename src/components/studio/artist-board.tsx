import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { gregorianToJalali } from "@/lib/calendar/jalali";
import { formatFaDateTime } from "@/lib/format";
import { tehranClock } from "@/lib/hours";
import { friendlyError, saveAction } from "@/lib/save";
import { dealLabel, type StudioArtistCard, type StudioChairRow, type StudioDeal } from "@/lib/studio-artists";
import { digitsOnly, formatGroupedDigits, formatTattooToman } from "@/lib/tattoo-flow";

type Ledger = { studioCutToman: number; artists: StudioChairRow[] };

export function StudioArtistBoard() {
  const clock = tehranClock();
  const today = gregorianToJalali(clock.y, clock.m, clock.day);
  const [rows, setRows] = useState<StudioArtistCard[]>([]);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deal, setDeal] = useState<StudioDeal>("percent");
  const [percent, setPercent] = useState("30");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [artists, month] = await Promise.all([
      saveAction<StudioArtistCard[]>("listStudioArtists"),
      saveAction<Ledger>("studioChairLedger", { jy: today.jy, jm: today.jm }),
    ]);
    setRows(artists);
    setLedger(month);
  }

  useEffect(() => {
    void load().catch((err) => toast.error(friendlyError(err)));
  }, []);

  async function save() {
    setBusy(true);
    try {
      await saveAction("saveStudioArtist", {
        name,
        email,
        phone,
        deal,
        percent: deal === "percent" ? Number(percent) : 0,
        amountToman: deal === "percent" ? 0 : Number(digitsOnly(amount)),
      });
      setName("");
      setEmail("");
      setPhone("");
      setAmount("");
      toast.success("همکار ذخیره شد. با همین ایمیل وارد پنل خودش می‌شود.");
      await load();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const byId = new Map((ledger?.artists ?? []).map((row) => [row.id, row]));

  return (
    <div className="mt-5 grid gap-4">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-bold">اجاره صندلی و کار درصدی</h2>
        <p className="mt-2 text-sm leading-7 text-muted">
          ایمیل تاتوکار را بنویس. با همان ایمیل پنل جدا می‌گیرد و مشتری‌های خودش را در تقویم خودش ثبت می‌کند. سهم تو از همان کارها حساب می‌شود، نه از عددی که خودش بگوید.
        </p>
        <div className="mt-4 grid gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام تاتوکار" className="h-12" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل ورود به پنل" dir="ltr" className="h-12" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="شماره، اختیاری" dir="ltr" className="h-12" />
          <NativeSelect value={deal} onChange={(e) => setDeal(e.target.value as StudioDeal)} className="h-12">
            <option value="percent">درصدی</option>
            <option value="daily">اجاره روزانه</option>
            <option value="weekly">اجاره هفتگی</option>
          </NativeSelect>
          {deal === "percent" ? (
            <Input value={percent} onChange={(e) => setPercent(e.target.value.replace(/\D/g, ""))} inputMode="numeric" dir="ltr" placeholder="درصد سهم استودیو" className="h-12" />
          ) : (
            <Input value={amount} onChange={(e) => setAmount(formatGroupedDigits(e.target.value))} inputMode="numeric" dir="ltr" placeholder={deal === "daily" ? "مبلغ هر روز" : "مبلغ هر هفته"} className="h-12" />
          )}
          <Button className="h-12" disabled={busy} onClick={() => void save()}>ذخیره همکار</Button>
        </div>
      </section>

      <p className="text-sm font-semibold">سهم استودیو این ماه: {formatTattooToman(ledger?.studioCutToman ?? 0)}</p>
      {rows.map((row) => {
        const money = byId.get(row.id);
        return (
          <article key={row.id} className="rounded-2xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <strong>{row.name}</strong>
              <span className="text-sm text-muted">{row.active ? "فعال" : "متوقف"}</span>
            </div>
            <p className="mt-1 text-sm" dir="ltr">{row.email}</p>
            <p className="mt-1 text-sm text-muted">{dealLabel(row.deal, row.percent, row.amountToman)}</p>
            {money ? (
              <p className="mt-2 text-sm leading-7">
                {new Intl.NumberFormat("fa-IR").format(money.jobCount)} کار · جمع قیمت {formatTattooToman(money.grossToman)}
                <br />
                {money.days} روز · {money.weeks} هفته · سهم تو {formatTattooToman(money.studioCutToman)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">این ماه هنوز کاری در تقویمش نیست.</p>
            )}
            {money?.jobs.map((job) => (
              <p key={job.id} className="mt-1 text-sm text-muted">
                {job.customerName} · {job.slotStart ? formatFaDateTime(job.slotStart) : "بدون تاریخ"} · {formatTattooToman(job.priceToman)}
              </p>
            ))}
            <Button
              variant="outline"
              className="mt-3 h-11"
              onClick={() =>
                void saveAction("saveStudioArtist", { ...row, amountToman: row.amountToman, active: !row.active })
                  .then(load)
                  .catch((err) => toast.error(friendlyError(err)))
              }
            >
              {row.active ? "توقف همکاری" : "فعال کردن دوباره"}
            </Button>
          </article>
        );
      })}
    </div>
  );
}

export function StudioChairShare() {
  const clock = tehranClock();
  const today = gregorianToJalali(clock.y, clock.m, clock.day);
  const [row, setRow] = useState<StudioChairRow | null>(null);

  useEffect(() => {
    void saveAction<Ledger>("studioChairLedger", { jy: today.jy, jm: today.jm })
      .then((data) => setRow(data.artists[0] ?? null))
      .catch((err) => toast.error(friendlyError(err)));
  }, []);

  if (!row) return <p className="mt-5 text-sm text-muted">سهم این ماه هنوز حساب نشده.</p>;
  return (
    <section className="mt-5 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-bold">سهم این ماه</h2>
      <p className="mt-2 text-sm leading-7">{dealLabel(row.deal, row.percent, row.amountToman)}</p>
      <p className="mt-2 text-sm leading-7">
        جمع قیمت کارها {formatTattooToman(row.grossToman)}
        <br />
        سهم استودیو {formatTattooToman(row.studioCutToman)}
        <br />
        مانده برای تو {formatTattooToman(row.artistKeepToman)}
      </p>
    </section>
  );
}
