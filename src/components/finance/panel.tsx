import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTomanFromIrr } from "@/lib/finance/money";
import { friendlyError, saveAction } from "@/lib/save";
import { formatFaDateTime } from "@/lib/format";

type FinancePayload = {
  provider: { mode: string; paymentReady: boolean; settlementReady: boolean };
  businesses: {
    id: string;
    name: string;
    gmvIrr: number;
    commissionIrr: number;
    payableIrr: number;
    heldIrr: number;
    settledIrr: number;
    refundIrr: number;
    ibanMasked: string | null;
  }[];
  payments: {
    id: string;
    bookingId: string;
    amountIrr: number;
    commissionIrr: number;
    netIrr: number;
    status: string;
    createdAt: string;
    reference: string | null;
  }[];
  totals: { gmvIrr: number; commissionIrr: number; payableIrr: number; heldIrr: number; settledIrr: number; refundIrr: number };
};

const STATUS_FA: Record<string, string> = {
  created: "ایجادشده",
  pending: "در انتظار",
  redirected: "هدایت به درگاه",
  paid: "موفق",
  failed: "ناموفق",
  cancelled: "لغو",
  refunded: "مسترد",
  partially_refunded: "استرداد جزئی",
};

export function FinancePanel({ action }: { action: "financeMine" | "financeAdmin" }) {
  const [data, setData] = useState<FinancePayload | null>(null);
  const [iban, setIban] = useState("");
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    void saveAction<FinancePayload>(action).then(setData).catch(() => setData(null));
  }, [action]);

  if (!data) return <p className="mt-4 text-sm text-muted">در حال بارگذاری مالی…</p>;
  const biz = data.businesses[0];

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-dashed border-border bg-surface p-4 text-sm">
        {data.provider.paymentReady ? (
          <p>درگاه وندار آماده است.</p>
        ) : (
          <p>پرداخت و تسویه آنلاین هنوز فعال نیست. رزرو بدون پرداخت مثل قبل کار می‌کند. هیچ پرداخت جعلی ثبت نمی‌شود.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="فروش ناخالص" value={data.totals.gmvIrr} />
        <Stat label="کارمزد کسب‌وکار" value={data.totals.commissionIrr} />
        <Stat label="قابل تسویه" value={data.totals.payableIrr} />
        <Stat label="در انتظار آزادسازی" value={data.totals.heldIrr} />
        <Stat label="تسویه‌شده" value={data.totals.settledIrr} />
        <Stat label="بازگشت وجه" value={data.totals.refundIrr} />
      </div>
      {biz ? (
        <article className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-semibold">حساب تسویه · {biz.name}</h3>
          <p className="mt-1 text-sm text-muted">{biz.ibanMasked ?? "شبایی ثبت نشده"}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="نام صاحب شبا" />
            <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IR…………" dir="ltr" />
          </div>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => {
              void saveAction("saveIban", { businessId: biz.id, iban, ownerName })
                .then(() => {
                  toast.success("شبا ذخیره شد.");
                  void saveAction<FinancePayload>(action).then(setData);
                })
                .catch((err) => toast.error(friendlyError(err)));
            }}
          >
            ذخیره شبا
          </Button>
          <Button
            className="mt-3 mr-2"
            disabled={!data.provider.settlementReady}
            onClick={() => {
              void saveAction("requestSettlement", { businessId: biz.id, amountIrr: biz.payableIrr })
                .then(() => toast.success("درخواست تسویه ثبت شد."))
                .catch((err) => toast.error(friendlyError(err)));
            }}
          >
            درخواست تسویه
          </Button>
        </article>
      ) : null}
      <div className="flex justify-between">
        <h3 className="font-semibold">تراکنش‌ها</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void saveAction<{ csv: string }>("financeCsv", {}).then((r) => {
              const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "kasbokar-finance.csv";
              a.click();
            });
          }}
        >
          خروجی CSV
        </Button>
      </div>
      <div className="grid gap-2">
        {!data.payments.length ? <p className="text-sm text-muted">تراکنش پرداخت‌شده‌ای نیست.</p> : null}
        {data.payments.map((p) => (
          <article key={p.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span>{formatTomanFromIrr(p.amountIrr)}</span>
              <span>{STATUS_FA[p.status] ?? p.status}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              کارمزد {formatTomanFromIrr(p.commissionIrr)} · سهم کسب‌وکار {formatTomanFromIrr(p.netIrr)}
            </p>
            <p className="text-xs text-muted">{formatFaDateTime(p.createdAt)} · {p.reference}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold">{formatTomanFromIrr(value)}</p>
    </div>
  );
}
