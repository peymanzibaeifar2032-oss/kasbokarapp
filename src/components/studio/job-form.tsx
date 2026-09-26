import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { JalaliDatePicker } from "@/components/calendar/jalali-date-picker";
import { CustomerFileDetails, toleranceMinutes, type CustomerFileBrief } from "@/components/studio/customer-file-brief";
import { DesignThumbs } from "@/components/studio/design-thumbs";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { BusinessResource } from "@/lib/calendar/resources";
import { firstOpenCustomerDay, tehranDayKey, tehranLocalToIso } from "@/lib/hours";
import { isIranMobile, normalizeIranPhone } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import { digitsOnly, formatGroupedDigits, isRetiredCollaborator } from "@/lib/tattoo-flow";
import { thursdayBusyKeys } from "@/lib/studio-apprentices";
import type { Booking, Business } from "@/lib/types";

export function StudioJobForm({
  businesses,
  bookings,
  onCreated,
  embedded = false,
}: {
  businesses: Business[];
  bookings: Booking[];
  onCreated: () => void;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(embedded);
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [instagram, setInstagram] = useState("");
  const [style, setStyle] = useState("");
  const [placement, setPlacement] = useState("");
  const [idea, setIdea] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [price, setPrice] = useState("");
  const [paid, setPaid] = useState("");
  const [day, setDay] = useState("");
  const [dayTouched, setDayTouched] = useState(false);
  const [time, setTime] = useState("12:00");
  const [minutes, setMinutes] = useState("180");
  const [minutesTouched, setMinutesTouched] = useState(false);
  const [customerFile, setCustomerFile] = useState<CustomerFileBrief | null>(null);
  const [filePending, setFilePending] = useState(false);
  const [resourceId, setResourceId] = useState("");
  const [resources, setResources] = useState<BusinessResource[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const busyKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const booking of bookings) {
      if (booking.businessId === businessId && booking.status !== "cancelled") {
        keys.add(tehranDayKey(new Date(booking.slotStart)));
      }
    }
    return [...keys];
  }, [bookings, businessId]);
  useEffect(() => {
    if (dayTouched) return;
    setDay(firstOpenCustomerDay(busyKeys, thursdayBusyKeys()));
  }, [busyKeys, dayTouched]);
  const visibleStaff = resources.filter((row) => row.active !== false && !isRetiredCollaborator(row.name));

  useEffect(() => {
    if (!businessId && businesses[0]) setBusinessId(businesses[0].id);
  }, [businesses, businessId]);

  useEffect(() => {
    if (!businessId) return;
    void saveAction<BusinessResource[]>("listResources", { businessId })
      .then((rows) => {
        const active = rows.filter((row) => row.active !== false && !isRetiredCollaborator(row.name));
        setResources(active);
        if (active.length === 1) setResourceId(active[0].id);
      })
      .catch(() => setResources([]));
  }, [businessId]);

  const phoneKey = digitsOnly(phone);
  const phone2Key = digitsOnly(phone2);
  useEffect(() => {
    if (phoneKey.length < 10 && phone2Key.length < 10) {
      setCustomerFile(null);
      setFilePending(false);
      return;
    }
    let cancelled = false;
    setFilePending(true);
    const timer = window.setTimeout(() => {
      void saveAction<CustomerFileBrief | null>("lookupStudioCustomerFile", { phone, phone2 })
        .then((next) => {
          if (cancelled) return;
          setCustomerFile(next);
          const known = next ? toleranceMinutes(next.toleranceHours) : null;
          if (known && !minutesTouched) setMinutes(String(known));
        })
        .catch(() => {
          if (!cancelled) setCustomerFile(null);
        })
        .finally(() => {
          if (!cancelled) setFilePending(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phone, phone2, phoneKey, phone2Key, minutesTouched]);

  function reset() {
    setName("");
    setPhone("");
    setPhone2("");
    setInstagram("");
    setStyle("");
    setPlacement("");
    setIdea("");
    setSizeCm("");
    setPrice("");
    setPaid("");
    setMinutes("180");
    setMinutesTouched(false);
    setCustomerFile(null);
    setDay("");
    setImages([]);
  }

  async function submit() {
    if (name.trim().length < 2) return toast.error("نام مشتری را بنویسید.");
    if (style.trim().length < 2) return toast.error("طرح را بنویسید.");
    if (placement.trim().length < 2) return toast.error("محل اجرا را بنویسید.");
    if (!price) return toast.error("مبلغ کل را بنویسید.");
    if (!day || !time) return toast.error("تاریخ و ساعت را انتخاب کنید.");
    if (phone.trim() && !isIranMobile(normalizeIranPhone(phone))) {
      return toast.error("شماره موبایل اول معتبر نیست.");
    }
    if (phone2.trim() && !isIranMobile(normalizeIranPhone(phone2))) {
      return toast.error("شماره موبایل دوم معتبر نیست.");
    }
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    setBusy(true);
    try {
      await saveAction("createStudioJob", {
        businessId,
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        customerPhone2: phone2.trim() || undefined,
        customerInstagram: instagram.trim() || undefined,
        style: style.trim(),
        idea: idea.trim() || style.trim(),
        placement: placement.trim(),
        sizeCm: sizeCm.trim() || undefined,
        priceMinToman: Number(price),
        paidToman: paid ? Number(paid) : 0,
        sessionMinutes: minutes ? Number(minutes) : 180,
        slotStart: tehranLocalToIso(y, m, d, hh, mm),
        resourceId: resourceId || undefined,
        referenceImages: images,
      });
      toast.success("اجرا در تقویم و لیست ماه ثبت شد.");
      reset();
      if (!embedded) setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const fields = (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.length > 1 ? (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">صفحه کسب‌وکار</span>
            <NativeSelect value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
        {visibleStaff.length > 1 ? (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">کارشناس</span>
            <NativeSelect value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
              {visibleStaff.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">نام مشتری</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً محمد محمدی" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">شماره تماس</span>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" placeholder="۰۹…" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">شماره دوم (اختیاری)</span>
          <Input value={phone2} onChange={(e) => setPhone2(e.target.value)} dir="ltr" inputMode="tel" placeholder="اگر دو تا شماره دارد" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">آیدی اینستاگرام (اختیاری)</span>
          <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} dir="ltr" placeholder="بدون @" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">طرح</span>
          <Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="نام یا موضوع طرح" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">محل اجرا</span>
          <Input value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="ساعد، بازو…" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">ابعاد به سانتی‌متر</span>
          <Input value={sizeCm} onChange={(e) => setSizeCm(e.target.value)} placeholder="مثلاً ۲۰ × ۱۲" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">قیمت کل طرح</span>
          <Input value={formatGroupedDigits(price)} onChange={(e) => setPrice(digitsOnly(e.target.value))} inputMode="numeric" dir="ltr" className="text-left tracking-wide" placeholder="تومان" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">مقدار واریزی</span>
          <Input value={formatGroupedDigits(paid)} onChange={(e) => setPaid(digitsOnly(e.target.value))} inputMode="numeric" dir="ltr" className="text-left tracking-wide" placeholder="تومان" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">مدت جلسه</span>
          <Input value={minutes} onChange={(e) => { setMinutesTouched(true); setMinutes(e.target.value.replace(/\D/g, "")); }} inputMode="numeric" placeholder="دقیقه" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">تاریخ اجرا</span>
          <JalaliDatePicker value={day} onChange={(next) => { setDayTouched(true); setDay(next); }} label="اولین روز خالی" busyKeys={busyKeys} />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">ساعت شروع</span>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      {phoneKey.length >= 10 || phone2Key.length >= 10 ? (
        customerFile || filePending ? (
          <CustomerFileDetails file={customerFile} pending={filePending && !customerFile} />
        ) : (
          <aside className="mt-3 rounded-2xl border border-border bg-bg p-4">
            <h3 className="text-sm font-bold">جزئیات پرونده مشتری</h3>
            <p className="mt-2 text-sm leading-7 text-muted">برای این شماره هنوز پرونده‌ای نوشته نشده. از بخش مخاطبین سال، تحمل و پوست را ثبت کن.</p>
          </aside>
        )
      ) : null}
      <label className="mt-3 grid gap-1.5 text-sm">
        <span className="font-medium">توضیح طرح</span>
        <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={2} placeholder="اختیاری" />
      </label>
      <div className="mt-3">
        <p className="text-sm font-medium">عکس طرح</p>
        <p className="mt-1 text-xs text-muted">آپلود کنید؛ بعداً هم می‌توانید دانلود کنید. حداکثر ۳ عکس.</p>
        <DesignThumbs
          images={images}
          filePrefix={style || name || "tarh"}
          max={3}
          onFiles={(urls) => setImages((current) => [...current, ...urls].slice(0, 3))}
          onRemove={(index) => setImages((current) => current.filter((_, i) => i !== index))}
        />
      </div>
      <Button className="mt-3" disabled={busy} onClick={() => void submit()}>
        ثبت اجرا در تقویم
      </Button>
    </>
  );

  if (embedded) return <div className="mt-3">{fields}</div>;

  return (
    <article className="rounded-2xl border border-dashed border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">ثبت دستی اجرا</h3>
          <p className="mt-1 text-sm text-muted">نام، طرح، محل اجرا، ابعاد، قیمت، واریزی، عکس و شماره‌ها.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? "بستن فرم" : "افزودن به تقویم کاری"}
        </Button>
      </div>
      {open ? <div className="mt-3">{fields}</div> : null}
    </article>
  );
}
