import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError, saveAction } from "@/lib/save";
import { formatEstimateRange, TATTOO_REQUEST_LABEL, type TattooEstimate } from "@/lib/tattoo-estimate";
import { digitsOnly, formatGroupedDigits, formatTattooToman } from "@/lib/tattoo-flow";
import type { TattooRequest } from "@/lib/types";

const CONFIDENCE = { low: "کم", mid: "متوسط", high: "بالا" };
const VERDICT = { low: "قیمت پیشنهادی پایین بود", ok: "قیمت پیشنهادی مناسب بود", high: "قیمت پیشنهادی بالا بود" } as const;

export function PriceBasis({ request, onChange }: { request: TattooRequest; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [basis, setBasis] = useState<TattooEstimate | null>(null);
  const [finalPrice, setFinalPrice] = useState("");
  const [anchorPrice, setAnchorPrice] = useState("");
  const [anchorTitle, setAnchorTitle] = useState("");
  const hasRange = request.estimateMinToman != null && request.estimateMaxToman != null;

  async function load() {
    setOpen(true);
    try {
      setBasis(await saveAction<TattooEstimate>("explainTattooPrice", { requestId: request.id }));
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function feedback(verdict: "low" | "ok" | "high") {
    const price = Number(digitsOnly(finalPrice));
    if (!price) return toast.error("قیمت نهایی را بزرگ‌تر از صفر بنویس.");
    try {
      await saveAction("saveTattooPriceFeedback", { requestId: request.id, verdict, finalPrice: price });
      toast.success("بازخورد ذخیره شد. این عدد قیمت نهایی رزرو نیست تا خودت در فرم تأیید ثبتش کنی.");
      onChange();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-bg p-3 text-sm leading-7">
      <p className="font-bold">قیمت تقریبی {hasRange ? formatEstimateRange(request.estimateMinToman || 0, request.estimateMaxToman || 0) : "هنوز از روی نمونه معتبر حساب نشده"}</p>
      <p className="text-muted">زمان تقریبی اجرا: {request.estimateMinutes ? `${new Intl.NumberFormat("fa-IR").format(request.estimateMinutes)} دقیقه` : "نامشخص"} · پیچیدگی {request.complexityScore ?? "—"} از ۱۰ · اطمینان {CONFIDENCE[request.estimateConfidence as keyof typeof CONFIDENCE] || "کم"}</p>
      <p className="text-muted">این عدد قیمت نهایی نیست. قیمت نهایی را فقط تو در فرم تأیید می‌نویسی.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={() => void load()}>مبنای برآورد قیمت</Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => void saveAction("toggleTattooPriceAnchor", { requestId: request.id }).then(() => { toast.success(request.isPriceAnchor ? "از نمونه‌های مهم برداشته شد." : "به عنوان نمونه مهم قیمت ذخیره شد."); onChange(); }).catch((err) => toast.error(friendlyError(err)))}>
          {request.isPriceAnchor ? "برداشتن نمونه مهم" : "نمونه مهم قیمت"}
        </Button>
      </div>
      {open && basis ? (
        <div className="mt-3 border-t border-border pt-3">
          <p>نمونه‌های معتبر: {new Intl.NumberFormat("fa-IR").format(basis.validSamples)}</p>
          <p>نمونه‌های مشابه: {new Intl.NumberFormat("fa-IR").format(basis.similarCount)}</p>
          {basis.similarMin && basis.similarMax ? <p>بازه نمونه‌های مشابه: {formatTattooToman(basis.similarMin)} تا {formatTattooToman(basis.similarMax)}</p> : null}
          {basis.median ? <p>میانه: {formatTattooToman(basis.median)}</p> : null}
          <p>اطمینان: {CONFIDENCE[basis.confidence]}</p>
          {basis.factors.map((factor) => <p key={factor} className="text-muted">{factor}</p>)}
          {basis.similar.map((item) => (
            <p key={item.id} className="text-muted">{item.title} · {formatTattooToman(item.priceToman)} · شباهت {new Intl.NumberFormat("fa-IR").format(item.score)}</p>
          ))}
          <Input className="mt-3 h-12" value={finalPrice} onChange={(e) => setFinalPrice(formatGroupedDigits(e.target.value))} inputMode="numeric" dir="ltr" placeholder="قیمت نهایی واقعی، تومان" />
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(VERDICT) as Array<keyof typeof VERDICT>).map((key) => (
              <Button key={key} type="button" variant="outline" className="h-11" onClick={() => void feedback(key)}>{VERDICT[key]}</Button>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <p className="font-semibold">افزودن نمونه قیمت دستی</p>
            <Input className="h-12" value={anchorTitle} onChange={(e) => setAnchorTitle(e.target.value)} placeholder="عنوان نمونه" />
            <Input className="h-12" value={anchorPrice} onChange={(e) => setAnchorPrice(formatGroupedDigits(e.target.value))} inputMode="numeric" dir="ltr" placeholder="قیمت نمونه، تومان" />
            <Button type="button" className="h-11" onClick={() => void saveAction("saveTattooPriceAnchor", {
              title: anchorTitle,
              requestType: request.requestType,
              placement: request.placement,
              style: request.style,
              sizeCm: request.sizeCm,
              colorMode: request.colorMode || "",
              priceToman: Number(digitsOnly(anchorPrice)),
            }).then(() => { toast.success("نمونه قیمت ذخیره شد."); setAnchorTitle(""); setAnchorPrice(""); }).catch((err) => toast.error(friendlyError(err)))}>
              ذخیره نمونه {TATTOO_REQUEST_LABEL[request.requestType] || ""}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
