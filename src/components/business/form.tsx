import { useState } from "react";
import { toast } from "sonner";
import { BusinessMap } from "@/components/map/business-map";
import { LocationPicker, type PickedPlace } from "@/components/location/picker";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { DEFAULT_HOURS, IRAN_CENTER } from "@/lib/data/catalog";
import { friendlyError, saveAction } from "@/lib/save";
import { parseToman } from "@/lib/format";
import type { Business, Category, PriceItem, WorkHour } from "@/lib/types";

const SLOT_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 10, label: "۱۰ دقیقه — کافه و خدمات سریع" },
  { minutes: 15, label: "۱۵ دقیقه" },
  { minutes: 20, label: "۲۰ دقیقه" },
  { minutes: 30, label: "۳۰ دقیقه" },
  { minutes: 45, label: "۴۵ دقیقه" },
  { minutes: 60, label: "۱ ساعت" },
  { minutes: 90, label: "۱٫۵ ساعت" },
  { minutes: 120, label: "۲ ساعت" },
  { minutes: 180, label: "۳ ساعت" },
  { minutes: 240, label: "۴ ساعت" },
  { minutes: 480, label: "۸ ساعت — یک روز کاری" },
  { minutes: 1440, label: "۱ روز" },
  { minutes: 2880, label: "۲ روز" },
  { minutes: 4320, label: "۳ روز — تعمیرات و پروژه" },
];

export function BusinessForm({
  categories,
  initial,
  presetLocation,
  onSaved,
}: {
  categories: Category[];
  initial?: Business;
  presetLocation?: { lat: number; lng: number };
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [place, setPlace] = useState<PickedPlace | null>(
    initial?.province
      ? {
          id: "",
          nameFa: initial.city,
          type: "city",
          typeFa: "شهر",
          context: `${initial.city} — ${initial.province}`,
          provinceName: initial.province,
        }
      : null,
  );
  const [address, setAddress] = useState(initial?.address ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? 0);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instagram, setInstagram] = useState(initial?.instagram ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [offerText, setOfferText] = useState(initial?.offerText ?? "");
  const [picked, setPicked] = useState(
    initial
      ? { lat: initial.latitude, lng: initial.longitude }
      : presetLocation ?? IRAN_CENTER,
  );
  const [prices, setPrices] = useState<PriceItem[]>(
    initial?.prices.length ? initial.prices : [{ title: "خدمت اصلی", price: 0 }],
  );
  const [hours, setHours] = useState<WorkHour[]>(initial?.workHours.length ? initial.workHours : DEFAULT_HOURS);
  const [slotMinutes, setSlotMinutes] = useState(initial?.slotMinutes ?? 60);
  const [busy, setBusy] = useState(false);
  const [showMap, setShowMap] = useState(Boolean(initial) || Boolean(presetLocation));

  async function submit() {
    if (name.trim().length < 2) {
      toast.error("نام کسب‌وکار را بنویسید.");
      return;
    }
    if (!categoryId) {
      toast.error("دسته را انتخاب کنید.");
      return;
    }
    if (!province.trim() || !city.trim()) {
      toast.error("موقعیت فعالیت را انتخاب کنید.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name,
        jobTitle,
        phone,
        province,
        city,
        address,
        latitude: picked.lat,
        longitude: picked.lng,
        categoryId,
        description,
        instagram,
        whatsapp,
        website,
        workHours: hours,
        slotMinutes,
        prices: prices.filter((p) => p.title.trim()),
        offerText,
      };
      if (initial) {
        await saveAction("updateBusiness", { ...payload, id: initial.id });
        toast.success("تغییرات ذخیره شد.");
      } else {
        await saveAction("createBusiness", payload);
        toast.success("ثبت شد و برای تأیید مدیریت ارسال گردید.");
      }
      onSaved();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <Input id="biz-name" placeholder="نام کسب‌وکار" value={name} onChange={(e) => setName(e.target.value)} />
        <Input id="biz-job" placeholder="عنوان شغلی" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input id="biz-phone" placeholder="تلفن" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input id="biz-whatsapp" placeholder="واتساپ" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <NativeSelect id="biz-category" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
          <option value={0}>انتخاب دسته</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <LocationPicker
          value={place}
          onChange={(next) => {
            setPlace(next);
            if (!next) {
              setProvince("");
              setCity("");
              return;
            }
            setProvince(next.provinceName || (next.type === "province" ? next.nameFa : ""));
            setCity(next.type === "province" ? next.nameFa : next.nameFa);
            if (next.latitude && next.longitude) {
              setPicked({ lat: next.latitude, lng: next.longitude });
              setShowMap(true);
            }
          }}
        />
        <Input placeholder="آدرس دقیق" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input placeholder="اینستاگرام (بدون @)" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        <Input placeholder="وب‌سایت (اختیاری)" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <Input placeholder="پیشنهاد ویژه، مثلاً ۲۰٪ تخفیف اولین رزرو" value={offerText} onChange={(e) => setOfferText(e.target.value)} />
        <Textarea placeholder="معرفی کوتاه برای مشتری" value={description} onChange={(e) => setDescription(e.target.value)} />

        <p className="pt-2 text-sm font-medium">خدمات و قیمت</p>
        {prices.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_8rem_auto] gap-2">
            <Input
              placeholder="نام خدمت"
              value={p.title}
              onChange={(e) =>
                setPrices((rows) => rows.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))
              }
            />
            <Input
              placeholder="تومان"
              inputMode="numeric"
              dir="ltr"
              value={p.price ? String(p.price) : ""}
              onChange={(e) =>
                setPrices((rows) =>
                  rows.map((r, j) => (j === i ? { ...r, price: parseToman(e.target.value) } : r)),
                )
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={prices.length <= 1}
              onClick={() => setPrices((rows) => (rows.length <= 1 ? rows : rows.filter((_, j) => j !== i)))}
            >
              حذف
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setPrices((rows) => [...rows, { title: "", price: 0 }])}>
          افزودن خدمت
        </Button>

        <p className="pt-2 text-sm font-medium">فاصله نوبت‌ها</p>
        <NativeSelect value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))}>
          {SLOT_OPTIONS.map((opt) => (
            <option key={opt.minutes} value={opt.minutes}>
              {opt.label}
            </option>
          ))}
        </NativeSelect>

        <p className="pt-2 text-sm font-medium">ساعت کاری</p>
        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={h.day} className="grid grid-cols-[5.5rem_1fr_1fr_auto] items-center gap-2">
              <span className="text-sm">{h.day}</span>
              <Input
                type="time"
                dir="ltr"
                disabled={h.closed}
                value={h.open}
                onChange={(e) =>
                  setHours((rows) => rows.map((r, j) => (j === i ? { ...r, open: e.target.value } : r)))
                }
              />
              <Input
                type="time"
                dir="ltr"
                disabled={h.closed}
                value={h.close}
                onChange={(e) =>
                  setHours((rows) => rows.map((r, j) => (j === i ? { ...r, close: e.target.value } : r)))
                }
              />
              <label className="flex items-center gap-1 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={Boolean(h.closed)}
                  onChange={(e) =>
                    setHours((rows) => rows.map((r, j) => (j === i ? { ...r, closed: e.target.checked } : r)))
                  }
                />
                تعطیل
              </label>
            </div>
          ))}
        </div>

        <Button className="w-full" disabled={busy} onClick={() => void submit()}>
          {busy ? "در حال ذخیره…" : initial ? "ذخیره تغییرات" : "ارسال برای تأیید"}
        </Button>
      </div>
      <div>
        <p className="mb-2 text-sm text-muted">
          محل پیش‌فرض مرکز {city || province} است. برای دقت بیشتر، پین را روی نقشه جابه‌جا کنید.
        </p>
        {showMap ? (
          <div className="h-[420px]">
            <BusinessMap
              businesses={[]}
              center={picked}
              zoom={13}
              pickMode
              picked={picked}
              onPick={(lat, lng) => setPicked({ lat, lng })}
            />
          </div>
        ) : (
          <Button type="button" variant="outline" className="w-full" onClick={() => setShowMap(true)}>
            انتخاب محل روی نقشه
          </Button>
        )}
      </div>
    </div>
  );
}
