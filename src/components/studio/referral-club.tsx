import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError, saveAction } from "@/lib/save";

type Club = {
  member: boolean;
  code?: string;
  accepting?: boolean;
  successCount?: number;
  referrals?: { label: string; state: string; done: boolean }[];
  prizes?: { milestone: number; title: string; status: string; ready: boolean }[];
};

export function ReferralClub() {
  const [phone, setPhone] = useState("");
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(nextPhone?: string) {
    setLoading(true);
    try {
      setClub(await saveAction<Club>("myReferralClub", nextPhone ? { phone: nextPhone } : {}));
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function copy() {
    if (!club?.code) return;
    try {
      await navigator.clipboard.writeText(club.code);
      toast.success("کد معرف کپی شد.");
    } catch {
      toast.error("کپی نشد. کد را دستی انتخاب کن.");
    }
  }

  if (loading && !club) return <p className="text-sm text-white/60">در حال دریافت باشگاه…</p>;
  if (!club?.member) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
        <h1 className="text-2xl font-black">باشگاه مشتریان</h1>
        <p className="mt-3 text-sm leading-7 text-white/70">
          عضویت خودکار نیست. اگر پیمان باشگاه را برای شماره تو فعال کرده باشد، همان شماره را بنویس.
        </p>
        <div className="mt-4 flex gap-2">
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} dir="ltr" placeholder="شماره موبایل" className="h-12 bg-black/30" />
          <Button className="h-12 bg-[#b7955b] text-black" onClick={() => void load(phone)}>
            دیدن کد
          </Button>
        </div>
      </section>
    );
  }
  const count = club.successCount || 0;
  const goal = count >= 10 ? 10 : count >= 5 ? 10 : 5;
  const left = Math.max(0, goal - count);
  const fa = new Intl.NumberFormat("fa-IR");
  return (
    <section className="grid gap-4">
      <article className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
        <h1 className="text-2xl font-black">باشگاه مشتریان</h1>
        <p className="mt-2 text-sm text-white/60">کد معرف من</p>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#b7955b]/40 bg-black/30 px-4 py-3">
          <strong className="text-xl tracking-wide" dir="ltr">{club.code}</strong>
          <Button size="sm" className="bg-[#b7955b] text-black" onClick={() => void copy()}>کپی</Button>
        </div>
        {club.accepting === false ? <p className="mt-3 text-sm text-white/60">این کد فعلاً معرفی جدید نمی‌پذیرد. معرفی‌های قبلی سر جایش است.</p> : null}
        <p className="mt-5 text-sm">معرفی موفق: {fa.format(count)} از ۱۰</p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[#b7955b]" style={{ width: `${Math.min(100, count * 10)}%` }} />
        </div>
        <p className="mt-2 text-sm text-white/70">
          {left === 0 ? "هر دو جایزه به تعداد رسیده." : `${fa.format(left)} معرفی موفق تا جایزه ${fa.format(goal)} مانده.`}
        </p>
        <p className="mt-2 text-xs leading-6 text-white/45">جایزه تخفیف روی کار فعلی نیست. یک نوبت جداست و بعداً از فرم درخواست ثبت می‌شود.</p>
      </article>
      {(club.prizes || []).map((prize) => (
        <article key={prize.milestone} className="rounded-3xl border border-white/10 p-4">
          <p className="font-bold">جایزه {new Intl.NumberFormat("fa-IR").format(prize.milestone)} معرفی</p>
          <p className="mt-1 text-sm leading-7 text-white/75">{prize.title}</p>
          <p className={`mt-2 text-sm font-bold ${prize.ready ? "text-[#dbc08d]" : "text-white/45"}`}>{prize.status}</p>
        </article>
      ))}
      <article className="rounded-3xl border border-white/10 p-4">
        <h2 className="font-bold">معرفی‌ها</h2>
        <div className="mt-3 grid gap-2">
          {(club.referrals || []).map((row) => (
            <p key={row.label} className="text-sm leading-7">
              {row.label} — {row.state} {row.done ? "✓" : ""}
            </p>
          ))}
          {!club.referrals?.length ? <p className="text-sm text-white/50">هنوز معرفی ثبت نشده.</p> : null}
        </div>
      </article>
    </section>
  );
}
