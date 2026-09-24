import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Download, ImagePlus, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DesignThumbs } from "@/components/studio/design-thumbs";
import { StudioVisitNote } from "@/components/studio/visit-note";
import { StudioTopBar } from "@/components/studio/top-bar";
import { useStudioAdminEntry } from "@/components/studio/use-studio-admin";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { compressImage, designFileName, downloadImage } from "@/lib/design-images";
import { formatFaDate, formatFaDateTime, formatToman, addBookingToPhoneCalendar } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import { TATTOO_CUSTOMER_STAGE_LABEL, TATTOO_STYLES, STUDIO_ADDRESS, tattooStage } from "@/lib/tattoo-flow";
import { scheduleTattooPrepNotices } from "@/lib/studio-notices";
import type { Profile, TattooRequest } from "@/lib/types";

export const Route = createFileRoute("/studio/request")({ component: StudioRequestPage });

function StudioRequestPage() {
  const { user } = useCurrentUserState();
  const { showAdmin } = useStudioAdminEntry();
  const userId = user?.id;
  const [requests, setRequests] = useState<TattooRequest[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [instagram, setInstagram] = useState("");
  const [requestType, setRequestType] = useState<"new" | "coverup" | "consultation">("new");
  const [style, setStyle] = useState<(typeof TATTOO_STYLES)[number]>("رئال");
  const [idea, setIdea] = useState("");
  const [placement, setPlacement] = useState("");
  const [sizeCm, setSizeCm] = useState("");
  const [preferredDates, setPreferredDates] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [bodyImages, setBodyImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function refresh() {
    void saveAction<TattooRequest[]>("myTattooRequests").then((rows) => {
      setRequests(rows);
      for (const request of rows) {
        if (tattooStage(request) === "booked" && request.proposedSlotStart) {
          scheduleTattooPrepNotices(request.proposedSlotStart, request.customerName || "مشتری");
        }
      }
    });
  }

  useEffect(() => {
    if (!userId) return;
    void saveAction<Profile>("profile").then((p) => {
      setName(p.displayName || user.displayName || "");
      setPhone(p.phone || "");
    });
    refresh();
  }, [userId]);

  async function addImages(files: FileList | null, target: "reference" | "body") {
    if (!files?.length) return;
    const limit = target === "reference" ? 3 : 2;
    const current = target === "reference" ? referenceImages : bodyImages;
    try {
      const next = await Promise.all(
        Array.from(files)
          .slice(0, limit - current.length)
          .map(compressImage),
      );
      if (target === "reference") setReferenceImages([...current, ...next]);
      else setBodyImages([...current, ...next]);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function submit() {
    setBusy(true);
    try {
      if (userId) {
        await saveAction("createTattooRequest", {
          customerName: name,
          customerPhone: phone,
          customerPhone2: phone2.trim() || undefined,
          customerInstagram: instagram.trim() || undefined,
          requestType,
          style,
          idea,
          placement,
          sizeCm,
          preferredDates,
          referenceImages,
          bodyImages,
        });
      } else {
        const res = await fetch("/api/tattoo-public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: name,
            customerPhone: phone,
            customerPhone2: phone2.trim() || undefined,
            customerInstagram: instagram.trim() || undefined,
            requestType,
            style,
            idea,
            placement,
            sizeCm,
            preferredDates,
            referenceImages,
            bodyImages,
          }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) throw new Error(data?.error || "ثبت انجام نشد.");
      }
      toast.success("درخواست برای بررسی پیمان ارسال شد. وضعیت را با همین شماره ببین.");
      setIdea("");
      setPlacement("");
      setSizeCm("");
      setPreferredDates("");
      setReferenceImages([]);
      setBodyImages([]);
      refresh();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudioRequestChrome>
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[1fr_19rem]">
        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-8">
          <p className="text-xs tracking-[.18em] text-[#b7955b]">PROJECT REQUEST</p>
          <h1 className="mt-2 text-3xl font-black">درخواست بررسی پروژه تاتو</h1>
          <p className="mt-3 text-sm leading-7 text-white/55">
            ابتدا طرح و محل بدن بررسی می‌شود. ایمیل و ساخت حساب لازم نیست؛ نام و شماره کافی است.
            بعد از تأیید، بازه قیمت، تعداد جلسه، بیعانه و زمان‌های مناسب برای شما فعال می‌شود.
          </p>
          {showAdmin ? (
            <a
              href="https://kasbokarapp.com/studio/admin"
              className="mt-5 flex h-12 items-center justify-between rounded-2xl bg-[#b7955b] px-4 text-sm font-bold text-black"
            >
              رفتن به مدیریت تاتو و تقویم
              <ChevronLeft className="size-4" />
            </a>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="شماره موبایل">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                dir="ltr"
              />
            </Field>
            <Field label="شماره دوم (اختیاری)">
              <Input
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                inputMode="tel"
                dir="ltr"
                placeholder="اگر دو تا شماره دارید"
              />
            </Field>
            <Field label="آیدی اینستاگرام (اختیاری)">
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                dir="ltr"
                placeholder="مثلاً sara.tattoo"
              />
            </Field>
            <Field label="نوع درخواست">
              <NativeSelect
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as typeof requestType)}
              >
                <option value="new">تاتوی جدید</option>
                <option value="coverup">کاور یا بازطراحی</option>
                <option value="consultation">مشاوره تخصصی</option>
              </NativeSelect>
            </Field>
            <Field label="سبک">
              <NativeSelect value={style} onChange={(e) => setStyle(e.target.value as (typeof TATTOO_STYLES)[number])}>
                {TATTOO_STYLES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="محل اجرا">
              <Input
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                placeholder="مثلاً ساعد دست راست"
              />
            </Field>
            <Field label="اندازه تقریبی">
              <Input
                value={sizeCm}
                onChange={(e) => setSizeCm(e.target.value)}
                placeholder="مثلاً ۲۰ × ۱۲ سانتی‌متر"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="ایده و جزئیات طرح">
                <Textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={5}
                  placeholder="موضوع، عناصر اصلی، تغییرات موردنظر و هر نکته مهم را بنویسید."
                />
              </Field>
            </div>
            <Field label="روزهای مناسب شما">
              <Input
                value={preferredDates}
                onChange={(e) => setPreferredDates(e.target.value)}
                placeholder="مثلاً شنبه و دوشنبه بعدازظهر"
              />
            </Field>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ImageField
              title="عکس یا رفرنس طرح"
              hint="حداکثر ۳ عکس"
              images={referenceImages}
              onFiles={(f) => void addImages(f, "reference")}
              onRemove={(i) => setReferenceImages((x) => x.filter((_, n) => n !== i))}
            />
            <ImageField
              title="عکس واضح محل بدن"
              hint="برای بررسی فرم بدن؛ حداکثر ۲ عکس"
              images={bodyImages}
              onFiles={(f) => void addImages(f, "body")}
              onRemove={(i) => setBodyImages((x) => x.filter((_, n) => n !== i))}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-[#b7955b]/25 bg-[#b7955b]/10 p-4 text-sm leading-7 text-[#e5d2ae]">
            ارسال این فرم به معنی رزرو قطعی نیست. زمان فقط پس از بررسی پروژه و تأیید شرایط نمایش
            داده می‌شود.
          </div>
          <Button
            className="mt-5 h-12 w-full bg-[#b7955b] text-black hover:bg-[#cfad70]"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ShieldCheck className="size-5" />
            )}{" "}
            ارسال برای بررسی
          </Button>
        </section>

        <aside className="space-y-4">
          <Link
            to="/studio/designs"
            className="flex h-12 items-center justify-between rounded-2xl border border-[#b7955b]/40 px-4 text-sm font-bold text-[#e5d2ae]"
          >
            انتخاب طرح
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            to="/studio/status"
            className="flex h-12 items-center justify-between rounded-2xl bg-[#b7955b] px-4 text-sm font-bold text-black"
          >
            بررسی وضعیت نوبت و پیام‌ها
            <ChevronLeft className="size-4" />
          </Link>
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
            <h2 className="font-bold">روند بررسی</h2>
            <ol className="mt-4 space-y-4 text-sm text-white/60">
              {[
                "ارسال اطلاعات و عکس‌ها",
                "بررسی توسط پیمان",
                "اعلام قیمت، زمان پیشنهادی و بیعانه",
                "تأیید شما، واریز و رزرو قطعی",
              ].map((x, i) => (
                <li key={x} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#b7955b] text-xs font-bold text-black">
                    {i + 1}
                  </span>
                  {x}
                </li>
              ))}
            </ol>
          </div>
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} onChange={refresh} />
          ))}
        </aside>
      </main>
    </StudioRequestChrome>
  );
}

function StudioRequestChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0b0b0c] text-[#f4f1ea]" dir="rtl">
      <StudioTopBar compact />
      <div className="border-b border-[#b7955b]/30 bg-[#b7955b]/12">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm leading-6 text-[#e5d2ae]">
            <Smartphone className="size-4 shrink-0" />
            اپ را روی صفحه اصلی بگذار؛ اندروید با دانلود، آیفون از سافاری.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/tattoo-apk?v=11"
              download="rezerv-vaght-tatoo.apk"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#b7955b] px-4 text-sm font-bold text-black"
            >
              <Download className="size-4" />
              دانلود اندروید
            </a>
            <Link
              to="/studio/app"
              hash="iphone-steps"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#b7955b]/40 px-4 text-sm text-[#e5d2ae]"
            >
              نصب آیفون
            </Link>
            <Link
              to="/studio/guide"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#b7955b]/40 px-4 text-sm text-[#e5d2ae]"
            >
              آموزش فرم
            </Link>
            <Link
              to="/studio/app"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#b7955b]/40 px-4 text-sm text-[#e5d2ae]"
            >
              راهنمای نصب
            </Link>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block text-white/70">{label}</span>
      {children}
    </label>
  );
}

function ImageField({
  title,
  hint,
  images,
  onFiles,
  onRemove,
}: {
  title: string;
  hint: string;
  images: string[];
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs text-white/40">{hint}</p>
      <label className="mt-4 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 text-sm">
        <ImagePlus className="size-4 text-[#b7955b]" /> انتخاب عکس
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      {images.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((src, i) => (
            <div key={`${src.slice(-20)}-${i}`} className="relative aspect-square overflow-hidden rounded-lg border border-white/10">
              <img src={src} alt="تصویر انتخابی" className="size-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex">
                <button
                  type="button"
                  className="flex-1 bg-black/70 py-1 text-[10px]"
                  onClick={() => downloadImage(src, designFileName(title, i))}
                >
                  دانلود
                </button>
                <button
                  type="button"
                  className="flex-1 bg-black/80 py-1 text-[10px]"
                  onClick={() => onRemove(i)}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RequestCard({ request, onChange }: { request: TattooRequest; onChange: () => void }) {
  const [receipt, setReceipt] = useState(request.receiptImage ?? "");
  const [receiptName, setReceiptName] = useState("");
  const [busy, setBusy] = useState(false);
  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setReceipt(await compressImage(file));
      setReceiptName(file.name);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }
  async function submitReceipt() {
    if (!receipt) return toast.error("عکس رسید را انتخاب کنید.");
    setBusy(true);
    try {
      await saveAction("submitTattooReceipt", { requestId: request.id, receiptImage: receipt });
      toast.success("رسید ارسال شد و در دست بررسی است.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  async function acceptProposal() {
    setBusy(true);
    try {
      await saveAction("acceptTattooProposal", { requestId: request.id });
      toast.success("زمان تأیید شد. اکنون رسید بیعانه را ارسال کنید.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  const stage = tattooStage(request);
  const canPay = request.paymentStatus === "awaiting_payment" || request.paymentStatus === "rejected";
  const paymentText =
    stage === "receipt_review"
      ? request.paymentReviewDeadline
        ? `رسید در دست بررسی؛ نتیجه حداکثر تا ${formatFaDateTime(request.paymentReviewDeadline)}`
        : "رسید در دست بررسی؛ نتیجه حداکثر تا ۱۲ ساعت"
      : stage === "receipt_overdue"
        ? "بررسی رسید از مهلت ۱۲ ساعته گذشته؛ زمان شما قفل مانده تا پیمان نتیجه را اعلام کند."
        : stage === "booked"
          ? "پرداخت تأیید شد و نوبت قطعی است."
          : stage === "expired"
            ? "مهلت واریز تمام شد و این زمان آزاد شد. منتظر زمان تازه از پیمان بمانید."
            : stage === "proposal_sent"
              ? "پیشنهاد پیمان آماده تأیید است. مهلت ۶ ساعته بعد از تأیید شما شروع می‌شود."
              : stage === "receipt_fix"
                ? "رسید نیاز به اصلاح دارد. ۶ ساعت برای ارسال رسید تازه فرصت دارید."
                : stage === "awaiting_payment"
                  ? "زمان تأیید شد. تا ۶ ساعت رسید واریز را بفرستید."
                  : null;
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-white/40">{formatFaDate(request.createdAt)}</p>
          <h3 className="mt-1 font-bold">{request.style}</h3>
        </div>
        <span className="rounded-full bg-[#b7955b]/15 px-2 py-1 text-[11px] text-[#d9bd87]">
          {TATTOO_CUSTOMER_STAGE_LABEL[stage]}
        </span>
      </div>
      <DesignThumbs
        images={[...request.referenceImages, ...request.bodyImages]}
        filePrefix={request.style}
        tone="dark"
      />
      {request.artistMessage ? (
        <p className="mt-4 text-sm leading-7 text-white/65">{request.artistMessage}</p>
      ) : null}
      {request.status === "approved" || request.status === "booked" ? (
        <div className="mt-4 space-y-1 text-sm text-white/65">
          {request.priceMinToman != null ? <p>قیمت: {formatToman(request.priceMinToman)}</p> : null}
          {request.sessionCount ? (
            <p>تعداد جلسه: {new Intl.NumberFormat("fa-IR").format(request.sessionCount)}</p>
          ) : null}
          {request.sessionMinutes ? (
            <p>
              مدت هر جلسه: {new Intl.NumberFormat("fa-IR").format(request.sessionMinutes)} دقیقه
            </p>
          ) : null}
          {request.depositToman != null ? <p>بیعانه: {formatToman(request.depositToman)}</p> : null}
          {request.proposedSlotStart ? (
            <div className="mt-3 rounded-xl border border-[#b7955b]/25 bg-[#b7955b]/10 p-3 text-[#e5d2ae]">
              <p className="font-semibold">زمان پیشنهادی پیمان</p>
              <p>{formatFaDateTime(request.proposedSlotStart)}</p>
              {request.paymentStatus === "proposal_pending" &&
              (request.paymentIban || request.paymentCardNumber) ? (
                <div className="mt-2 text-sm">
                  {request.paymentIban ? <p dir="ltr">شبا: {request.paymentIban}</p> : null}
                  {request.paymentCardNumber ? (
                    <p dir="ltr">کارت: {request.paymentCardNumber}</p>
                  ) : null}
                  <StudioVisitNote tone="dark" />
                </div>
              ) : null}
              {request.paymentStatus === "proposal_pending" ? (
                <Button
                  disabled={busy}
                  className="mt-3 w-full bg-[#b7955b] text-black"
                  onClick={() => void acceptProposal()}
                >
                  تأیید این زمان و شروع مهلت پرداخت
                </Button>
              ) : null}
            </div>
          ) : null}
          {canPay && (request.paymentIban || request.paymentCardNumber) ? (
            <div className="mt-3 rounded-xl border border-[#b7955b]/25 bg-[#b7955b]/10 p-3 text-[#e5d2ae]">
              <p className="font-semibold">اطلاعات واریز بیعانه</p>
              {request.paymentIban ? <p dir="ltr">شبا: {request.paymentIban}</p> : null}
              {request.paymentCardNumber ? (
                <p dir="ltr">کارت: {request.paymentCardNumber}</p>
              ) : null}
              <StudioVisitNote tone="dark" />
              <p className="text-xs">
                {stage === "receipt_fix"
                  ? "تا پایان مهلت اصلاح، همین زمان قفل می‌ماند."
                  : "از زمان تأیید شما، ۶ ساعت برای واریز فرصت دارید."}
              </p>
            </div>
          ) : null}
          {request.paymentHoldUntil && canPay ? (
            <p className="text-amber-300">
              مهلت واریز: {formatFaDateTime(request.paymentHoldUntil)}
            </p>
          ) : null}
          {paymentText ? <p className="text-emerald-300">{paymentText}</p> : null}
          {stage === "booked" ? <StudioVisitNote tone="dark" /> : null}
          {stage === "booked" && request.proposedSlotStart ? (
            <Button
              className="mt-3 w-full bg-[#b7955b] text-black"
              onClick={() =>
                addBookingToPhoneCalendar({
                  title: "نوبت تاتو · پیمان زیبائی‌فر",
                  startIso: request.proposedSlotStart!,
                  minutes:
                    request.proposedSlotEnd && request.proposedSlotStart
                      ? Math.max(
                          10,
                          Math.round(
                            (new Date(request.proposedSlotEnd).getTime() -
                              new Date(request.proposedSlotStart).getTime()) /
                              60000,
                          ),
                        )
                      : request.sessionMinutes || 120,
                  location: STUDIO_ADDRESS,
                  description: [request.style, request.artistMessage].filter(Boolean).join(" — "),
                  fileName: `tattoo-${request.id}.ics`,
                })
              }
            >
              افزودن به تقویم گوشی
            </Button>
          ) : null}
          {canPay ? (
            <div className="mt-4 rounded-2xl border border-[#b7955b]/35 bg-[#b7955b]/5 p-4">
              <p className="font-semibold text-[#e5d2ae]">
                {stage === "receipt_fix" ? "ارسال رسید اصلاح‌شده" : "ارسال عکس رسید واریز"}
              </p>
              <p className="mt-1 text-xs leading-6 text-white/50">
                عکس رسید را از گالری گوشی انتخاب کنید؛ سپس دکمه ارسال را بزنید.
              </p>
              <label className="mt-3 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#b7955b]/50 bg-[#b7955b]/15 px-3 font-bold text-[#e5d2ae]">
                <ImagePlus className="size-5" />
                {receipt ? "تغییر عکس رسید" : "انتخاب عکس رسید از گالری"}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => void pick(e.target.files?.[0])}
                />
              </label>
              {receiptName ? (
                <p className="mt-2 text-center text-xs text-emerald-300">
                  انتخاب شد: {receiptName}
                </p>
              ) : null}
              {receipt ? (
                <img
                  src={receipt}
                  alt="پیش‌نمایش رسید"
                  className="mx-auto mt-3 max-h-52 rounded-xl border border-white/10 object-contain"
                />
              ) : null}
              <Button
                disabled={busy || !receipt}
                className="mt-3 h-12 w-full"
                onClick={() => void submitReceipt()}
              >
                {busy ? "در حال ارسال…" : "ارسال رسید برای بررسی"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
