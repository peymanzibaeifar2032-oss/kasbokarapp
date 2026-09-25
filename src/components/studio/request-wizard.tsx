import { ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { compressImage } from "@/lib/design-images";
import {
  TATTOO_BODY_PARTS,
  TATTOO_COLORS,
  TATTOO_REQUEST_LABEL,
  TATTOO_SIDES,
  TATTOO_SIZE_LABELS,
  TATTOO_STYLE_OPTIONS,
} from "@/lib/tattoo-estimate";

export type WizardImage = { kind: "placement" | "current" | "reference" | "sketch"; data: string };

export type WizardPayload = {
  customerName: string;
  customerPhone: string;
  customerPhone2?: string;
  customerInstagram?: string;
  requestType: string;
  style: string;
  styles: string[];
  idea: string;
  placement: string;
  sizeCm: string;
  sizeMode: string;
  colorMode: string;
  bodySide: string;
  preferredDates?: string;
  images: WizardImage[];
};

const TYPES = [
  ["new", "تاتوی جدید", ""],
  ["custom", "طراحی اختصاصی", "طرح از صفر برای تو کشیده می‌شود."],
  ["coverup", "کاور تاتوی قبلی", "برای پوشاندن یا تغییر تاتویی که از قبل روی پوست داری."],
  ["repair", "ترمیم", "اگر رنگ تاتوی قبلی رفته یا نیاز به اصلاح دارد."],
  ["continuation", "تکمیل تاتوی قبلی", "ادامه کاری که قبلاً شروع شده."],
  ["consultation", "مشاوره", "اگر هنوز طرح قطعی نداری."],
] as const;

const IMAGE_KINDS = [
  ["placement", "عکس محل اجرا"],
  ["current", "عکس تاتوی فعلی"],
  ["reference", "تصویر مرجع"],
  ["sketch", "طرح اولیه"],
] as const;

export function TattooRequestWizard({
  busy,
  initialName,
  initialPhone,
  onSubmit,
}: {
  busy: boolean;
  initialName: string;
  initialPhone: string;
  onSubmit: (payload: WizardPayload) => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [phone2, setPhone2] = useState("");
  const [instagram, setInstagram] = useState("");
  const [requestType, setRequestType] = useState("new");
  const [part, setPart] = useState("ساعد");
  const [side, setSide] = useState("right");
  const [sizeMode, setSizeMode] = useState<"cm" | "approx" | "unknown">("approx");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [sizeLabel, setSizeLabel] = useState("medium");
  const [styles, setStyles] = useState<string[]>([]);
  const [colorMode, setColorMode] = useState("blackgrey");
  const [images, setImages] = useState<WizardImage[]>([]);
  const [idea, setIdea] = useState("");
  const [preferredDates, setPreferredDates] = useState("");

  useEffect(() => {
    if (initialName) setName((current) => current || initialName);
    if (initialPhone) setPhone((current) => current || initialPhone);
  }, [initialName, initialPhone]);

  const sideLabel = TATTOO_SIDES.find((item) => item[0] === side)?.[1] || "";
  const placement = `${part}، ${sideLabel}`;
  const sizeCm =
    sizeMode === "unknown"
      ? "اندازه را نمی‌دانم"
      : sizeMode === "cm"
        ? `${width || "؟"}×${height || "؟"} سانتی‌متر`
        : TATTOO_SIZE_LABELS.find((item) => item[0] === sizeLabel)?.[1] || "متوسط";
  const styleText =
    styles.map((id) => TATTOO_STYLE_OPTIONS.find((item) => item[0] === id)?.[1] || id).join("، ") || "سبک را نمی‌دانم";
  const needsCurrent = requestType === "coverup" || requestType === "repair";

  function next() {
    if (step === 0 && (name.trim().length < 2 || phone.trim().length < 10)) {
      toast.error("نام و شماره تماس را کامل بنویس.");
      return;
    }
    if (step === 1 && sizeMode === "cm" && (!width || !height)) {
      toast.error("طول و عرض را به سانتی‌متر بنویس، یا اندازه تقریبی را انتخاب کن.");
      return;
    }
    if (step === 3 && needsCurrent && !images.some((image) => image.kind === "current")) {
      toast.error("برای کاور یا ترمیم، عکس تاتوی فعلی لازم است.");
      return;
    }
    if (step === 4 && idea.trim().length < 10) {
      toast.error("ایده را کمی کامل‌تر توضیح بده.");
      return;
    }
    setStep((value) => Math.min(5, value + 1));
  }

  async function addFiles(kind: WizardImage["kind"], list: FileList | null) {
    if (!list?.length) return;
    if (images.length >= 8) {
      toast.error("حداکثر ۸ تصویر می‌توانی بفرستی.");
      return;
    }
    try {
      const nextImages = await Promise.all(Array.from(list).slice(0, 8 - images.length).map(compressImage));
      setImages((current) => [...current, ...nextImages.map((data) => ({ kind, data }))]);
    } catch {
      toast.error("بارگذاری تصویر انجام نشد. دوباره تلاش کنید.");
    }
  }

  const titles = ["اطلاعات اولیه", "محل و اندازه", "سبک و رنگ", "تصاویر", "توضیح ایده", "مرور و ارسال"];

  return (
    <div className="mt-8">
      <p className="text-sm text-[#e5d2ae]">مرحله {step + 1} از ۶ · {titles[step]}</p>
      {step === 0 ? (
        <div className="mt-4 grid gap-3">
          <Input className="h-12" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی" />
          <Input className="h-12" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="شماره تماس" inputMode="tel" dir="ltr" />
          <Input className="h-12" value={phone2} onChange={(e) => setPhone2(e.target.value)} placeholder="شماره دوم، اگر داری" inputMode="tel" dir="ltr" />
          <Input className="h-12" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="آیدی اینستاگرام، اختیاری" dir="ltr" />
          <div className="grid gap-2">
            {TYPES.map(([id, label, hint]) => (
              <button key={id} type="button" onClick={() => setRequestType(id)} className={`rounded-2xl border p-3 text-right ${requestType === id ? "border-[#b7955b] bg-[#b7955b]/15" : "border-white/10"}`}>
                <span className="font-bold">{label}</span>
                {hint ? <span className="mt-1 block text-sm text-white/55">{hint}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap gap-2">
            {TATTOO_BODY_PARTS.map((item) => (
              <button key={item} type="button" onClick={() => setPart(item)} className={`h-11 rounded-full border px-3 text-sm ${part === item ? "border-[#b7955b] bg-[#b7955b] text-black" : "border-white/15"}`}>{item}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {TATTOO_SIDES.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setSide(id)} className={`h-11 flex-1 rounded-2xl border text-sm ${side === id ? "border-[#b7955b] bg-[#b7955b] text-black" : "border-white/15"}`}>{label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {([["cm", "طول و عرض"], ["approx", "اندازه تقریبی"], ["unknown", "نمی‌دانم"]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setSizeMode(id)} className={`h-11 flex-1 rounded-2xl border text-sm ${sizeMode === id ? "border-[#b7955b] bg-[#b7955b] text-black" : "border-white/15"}`}>{label}</button>
            ))}
          </div>
          {sizeMode === "approx" ? <p className="text-sm text-white/55">اگر اندازه دقیق را نمی‌دانی، نزدیک‌ترین اندازه را انتخاب کن.</p> : null}
          {sizeMode === "cm" ? (
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-12" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="طول، سانتی‌متر" inputMode="decimal" dir="ltr" />
              <Input className="h-12" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="عرض، سانتی‌متر" inputMode="decimal" dir="ltr" />
            </div>
          ) : null}
          {sizeMode === "approx" ? (
            <div className="flex flex-wrap gap-2">
              {TATTOO_SIZE_LABELS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setSizeLabel(id)} className={`h-11 rounded-full border px-3 text-sm ${sizeLabel === id ? "border-[#b7955b] bg-[#b7955b] text-black" : "border-white/15"}`}>{label}</button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {step === 2 ? (
        <div className="mt-4 grid gap-3">
          <p className="text-sm text-white/55">می‌توانی چند سبک را انتخاب کنی. اگر مطمئن نیستی، «سبک را نمی‌دانم» را بزن و تصویر مرجع بفرست.</p>
          <div className="flex flex-wrap gap-2">
            {TATTOO_STYLE_OPTIONS.map(([id, label]) => {
              const on = styles.includes(id);
              return (
                <button key={id} type="button" onClick={() => setStyles((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} className={`h-11 rounded-full border px-3 text-sm ${on ? "border-[#b7955b] bg-[#b7955b] text-black" : "border-white/15"}`}>{label}</button>
              );
            })}
          </div>
          <div className="grid gap-2">
            {TATTOO_COLORS.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setColorMode(id)} className={`h-12 rounded-2xl border text-sm ${colorMode === id ? "border-[#b7955b] bg-[#b7955b]/15" : "border-white/10"}`}>{label}</button>
            ))}
          </div>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="mt-4 grid gap-4">
          {IMAGE_KINDS.map(([kind, label]) => (
            <div key={kind}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{label}{kind === "current" && needsCurrent ? " (الزامی)" : ""}</p>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/15 px-3 text-sm">
                  <ImagePlus className="size-4" /> افزودن
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addFiles(kind, e.target.files)} />
                </label>
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {images.map((image, index) => image.kind === kind ? (
                  <div key={`${kind}-${index}`} className="relative">
                    <img src={image.data} alt="" className="h-24 w-24 rounded-xl object-cover" />
                    <button type="button" className="absolute left-1 top-1 rounded-full bg-black/70 px-2 text-xs" onClick={() => setImages((current) => current.filter((_, item) => item !== index))}>حذف</button>
                  </div>
                ) : null)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {step === 4 ? (
        <div className="mt-4 grid gap-3">
          <Textarea rows={7} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="ایده‌ای که تو ذهنت داری رو توضیح بده." />
          <Input className="h-12" value={preferredDates} onChange={(e) => setPreferredDates(e.target.value)} placeholder="روزهای مناسب، اختیاری" />
        </div>
      ) : null}
      {step === 5 ? (
        <div className="mt-4 rounded-2xl border border-white/10 p-4 text-sm leading-8">
          <p>نوع درخواست: {TATTOO_REQUEST_LABEL[requestType]}</p>
          <p>محل: {placement}</p>
          <p>اندازه: {sizeCm}</p>
          <p>سبک: {styleText}</p>
          <p>رنگ: {TATTOO_COLORS.find((item) => item[0] === colorMode)?.[1]}</p>
          <p>تعداد تصاویر: {new Intl.NumberFormat("fa-IR").format(images.length)}</p>
          <p>توضیح: {idea}</p>
        </div>
      ) : null}
      <div className="mt-5 flex gap-2">
        {step > 0 ? <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setStep((value) => value - 1)}>قبلی</Button> : null}
        {step < 5 ? <Button type="button" className="h-12 flex-1 bg-[#b7955b] text-black" onClick={next}>بعدی</Button> : (
          <Button type="button" className="h-12 flex-1 bg-[#b7955b] text-black" disabled={busy} onClick={() => onSubmit({
            customerName: name.trim(),
            customerPhone: phone.trim(),
            customerPhone2: phone2.trim() || undefined,
            customerInstagram: instagram.trim() || undefined,
            requestType,
            style: styleText,
            styles,
            idea: idea.trim(),
            placement,
            sizeCm,
            sizeMode,
            colorMode,
            bodySide: side,
            preferredDates: preferredDates.trim() || undefined,
            images,
          })}>
            {busy ? <Loader2 className="size-5 animate-spin" /> : "ثبت درخواست"}
          </Button>
        )}
      </div>
    </div>
  );
}
