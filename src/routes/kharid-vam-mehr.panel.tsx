import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatFaDateTime, formatToman } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import type { MehrLoanLead, MehrLoanLeadStatus, Profile } from "@/lib/types";

export const Route = createFileRoute("/kharid-vam-mehr/panel")({ component: MehrLoanPanel });

const statusLabel: Record<MehrLoanLeadStatus, string> = {
  reviewing: "در حال بررسی",
  contacted: "تماس گرفته شد",
  purchased: "خرید انجام شد",
  rejected: "رد شد",
};

function MehrLoanPanel() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<MehrLoanLead[]>([]);
  const [loading, setLoading] = useState(false);

  function refresh() {
    setLoading(true);
    void saveAction<MehrLoanLead[]>("mehrLoanLeads").then(setItems).catch((error) => toast.error(friendlyError(error))).finally(() => setLoading(false));
import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatFaDateTime, formatToman } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import type { MehrLoanLead, MehrLoanLeadStatus, Profile } from "@/lib/types";

export const Route = createFileRoute("/kharid-vam-mehr/panel")({
  head: () => ({
    meta: [
      { title: "پنل خصوصی درخواست‌های وام مهر" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: MehrLoanPanel,
});

const statusLabel: Record<MehrLoanLeadStatus, string> = {
  reviewing: "در حال بررسی",
  contacted: "تماس گرفته شد",
  purchased: "خرید انجام شد",
  rejected: "رد شد",
};

function MehrLoanPanel() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<MehrLoanLead[]>([]);
  const [loading, setLoading] = useState(false);

  function refresh() {
    setLoading(true);
    void saveAction<MehrLoanLead[]>("mehrLoanLeads").then(setItems).catch((error) => toast.error(friendlyError(error))).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) return;
    void saveAction<Profile>("profile").then((next) => { setProfile(next); if (next.isAdmin) refresh(); });
  }, [user]);

  if (!user) return <SignedOutPanel title="پنل درخواست‌های وام مهر" next="/kharid-vam-mehr/panel" loading={isPending} error={sessionError} onRetry={retry} />;
  if (profile && !profile.isAdmin) return <div className="min-h-dvh bg-[#f7f8f5] p-6" dir="rtl"><div className="mx-auto max-w-xl rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">دسترسی پنل فعال نیست</h1><p className="mt-3 text-sm text-slate-600">این حساب هنوز مجوز مشاهده شماره‌های کامل درخواست‌ها را ندارد.</p><Link to="/kharid-vam-mehr" className="mt-5 inline-block text-[#087a55]">بازگشت به صفحه اصلی</Link></div></div>;

  return <div dir="rtl" className="min-h-dvh bg-[#f2f5f2] text-[#102a2a]">
    <header className="border-b border-[#dfe7df] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><div><p className="text-xs text-[#087a55]">عرفان حق‌شنو</p><h1 className="font-black">درخواست‌های فروش امتیاز وام مهر</h1></div><Button variant="outline" size="sm" onClick={refresh} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />به‌روزرسانی</Button></div></header>
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">اطلاعات این صفحه محرمانه است و نباید منتشر شود.</p><span className="rounded-full bg-[#e5f3ec] px-3 py-1 text-sm font-bold text-[#087a55]">{new Intl.NumberFormat("fa-IR").format(items.length)} درخواست</span></div>
      <div className="grid gap-4">
        {items.map((lead) => <article key={lead.id} className="rounded-2xl border border-[#dfe7df] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-slate-500">کد پیگیری <span dir="ltr">{lead.trackingCode}</span> · {formatFaDateTime(lead.createdAt)}</p><h2 className="mt-1 text-lg font-black">{lead.fullName}</h2></div><NativeSelect className="w-44" value={lead.status} onChange={(event) => { const status = event.target.value as MehrLoanLeadStatus; void saveAction("updateMehrLoanLead", { id: lead.id, status }).then(refresh).catch((error) => toast.error(friendlyError(error))); }}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
          <div className="mt-4 grid gap-3 rounded-xl bg-[#f6f8f6] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <a href={`tel:${lead.phone}`} dir="ltr" className="flex items-center gap-2 font-bold text-[#087a55]"><Phone className="size-4" />{lead.phone}</a>
            <p><span className="text-slate-500">مبلغ امتیاز:</span> {lead.scoreAmountToman ? formatToman(lead.scoreAmountToman) : "ثبت نشده"}</p>
            <p><span className="text-slate-500">بازپرداخت:</span> {lead.repaymentMonths ? `${new Intl.NumberFormat("fa-IR").format(lead.repaymentMonths)} ماه` : "ثبت نشده"}</p>
            <p><span className="text-slate-500">شهر:</span> {lead.city || "ثبت نشده"}</p>
          </div>
          {lead.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700"><span className="font-bold">توضیحات: </span>{lead.description}</p> : null}
        </article>)}
        {!loading && !items.length ? <div className="rounded-2xl border border-dashed border-[#cfdad2] bg-white p-10 text-center text-sm text-slate-500">هنوز درخواستی ثبت نشده است.</div> : null}
      </div>
    </main>
  </div>;
}
  }

  useEffect(() => {
    if (!user) return;
    void saveAction<Profile>("profile").then((next) => { setProfile(next); if (next.isAdmin) refresh(); });
  }, [user]);

  if (!user) return <SignedOutPanel title="پنل درخواست‌های وام مهر" next="/kharid-vam-mehr/panel" loading={isPending} error={sessionError} onRetry={retry} />;
  if (profile && !profile.isAdmin) return <div className="min-h-dvh bg-[#f7f8f5] p-6" dir="rtl"><div className="mx-auto max-w-xl rounded-2xl bg-white p-6"><h1 className="text-xl font-bold">دسترسی پنل فعال نیست</h1><p className="mt-3 text-sm text-slate-600">این حساب هنوز مجوز مشاهده شماره‌های کامل درخواست‌ها را ندارد.</p><Link to="/kharid-vam-mehr" className="mt-5 inline-block text-[#087a55]">بازگشت به صفحه اصلی</Link></div></div>;

  return <div dir="rtl" className="min-h-dvh bg-[#f2f5f2] text-[#102a2a]">
    <header className="border-b border-[#dfe7df] bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><div><p className="text-xs text-[#087a55]">عرفان حق‌شنو</p><h1 className="font-black">درخواست‌های فروش امتیاز وام مهر</h1></div><Button variant="outline" size="sm" onClick={refresh} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />به‌روزرسانی</Button></div></header>
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">اطلاعات این صفحه محرمانه است و نباید منتشر شود.</p><span className="rounded-full bg-[#e5f3ec] px-3 py-1 text-sm font-bold text-[#087a55]">{new Intl.NumberFormat("fa-IR").format(items.length)} درخواست</span></div>
      <div className="grid gap-4">
        {items.map((lead) => <article key={lead.id} className="rounded-2xl border border-[#dfe7df] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-slate-500">کد پیگیری <span dir="ltr">{lead.trackingCode}</span> · {formatFaDateTime(lead.createdAt)}</p><h2 className="mt-1 text-lg font-black">{lead.fullName}</h2></div><NativeSelect className="w-44" value={lead.status} onChange={(event) => { const status = event.target.value as MehrLoanLeadStatus; void saveAction("updateMehrLoanLead", { id: lead.id, status }).then(refresh).catch((error) => toast.error(friendlyError(error))); }}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
          <div className="mt-4 grid gap-3 rounded-xl bg-[#f6f8f6] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <a href={`tel:${lead.phone}`} dir="ltr" className="flex items-center gap-2 font-bold text-[#087a55]"><Phone className="size-4" />{lead.phone}</a>
            <p><span className="text-slate-500">مبلغ امتیاز:</span> {lead.scoreAmountToman ? formatToman(lead.scoreAmountToman) : "ثبت نشده"}</p>
            <p><span className="text-slate-500">بازپرداخت:</span> {lead.repaymentMonths ? `${new Intl.NumberFormat("fa-IR").format(lead.repaymentMonths)} ماه` : "ثبت نشده"}</p>
            <p><span className="text-slate-500">شهر:</span> {lead.city || "ثبت نشده"}</p>
          </div>
          {lead.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700"><span className="font-bold">توضیحات: </span>{lead.description}</p> : null}
        </article>)}
        {!loading && !items.length ? <div className="rounded-2xl border border-dashed border-[#cfdad2] bg-white p-10 text-center text-sm text-slate-500">هنوز درخواستی ثبت نشده است.</div> : null}
      </div>
    </main>
  </div>;
}
