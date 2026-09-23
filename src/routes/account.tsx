import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/layout/shell";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isStudioOwnerEmail } from "@/lib/studio-owner";

export const Route = createFileRoute("/account")({ component: Account });

function Account() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const owner = isStudioOwnerEmail(user?.primaryEmail);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("رمز حداقل ۸ حرف باشد.");
      return;
    }
    if (password !== again) {
      toast.error("تکرار رمز یکی نیست.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/set-app-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string; email?: string } | null;
      if (!res.ok) throw new Error(data?.error || "ذخیرهٔ رمز انجام نشد.");
      toast.success(data?.message || "رمز ذخیره شد.");
      setPassword("");
      setAgain("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ذخیرهٔ رمز انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <SignedOutPanel
        title="حساب نوبت تاتو"
        next="/account"
        error={sessionError}
        loading={isPending}
        onRetry={retry}
      />
    );
  }

  return (
    <Shell>
      <p className="text-xs text-muted">استودیو پیمان زیبائی‌فر</p>
      <h1 className="mt-2 text-2xl font-semibold">حساب نوبت تاتو</h1>
      <p className="mt-2 text-sm">
        وارد شده‌اید: <strong>{user.displayName || user.primaryEmail || "حساب شما"}</strong>
      </p>
      <p className="mt-2 max-w-xl text-sm leading-7 text-muted">
        وضعیت تأیید، پیام‌ها و زمان قطعی اینجاست. لیست مشتری، تقویم و نوبت‌های ثبت‌شده در پنل مدیریت
        می‌ماند و از این صفحه پاک نمی‌شود.
      </p>
      <form onSubmit={savePassword} className="mt-6 max-w-md rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-base font-semibold">رمز ورود اپ</h2>
        <p className="mt-1 text-sm leading-7 text-muted">
          ایمیل بازیابی اگر نرسد، رمز را همین‌جا بگذار. در اپ دقیقاً این ایمیل را بنویس:
          {" "}
          <strong>{user.primaryEmail}</strong>
        </p>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="رمز جدید، حداقل ۸ حرف"
          className="mt-3 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm"
        />
        <input
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          placeholder="تکرار رمز"
          className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-3 inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-fg disabled:opacity-60"
        >
          {busy ? "در حال ذخیره…" : "ذخیرهٔ رمز ورود اپ"}
        </button>
      </form>
      <div className="mt-6 flex flex-wrap gap-2">
        {owner ? (
          <Link to="/studio/admin" className="inline-flex h-11 items-center rounded-full bg-primary px-4 text-sm text-primary-fg">
            پنل مدیریت تاتو
          </Link>
        ) : null}
        <Link to="/studio/status" className="inline-flex h-11 items-center rounded-full border border-border bg-surface px-4 text-sm">
          وضعیت نوبت
        </Link>
        <Link to="/studio/request" className="inline-flex h-11 items-center rounded-full border border-border bg-surface px-4 text-sm">
          درخواست جدید
        </Link>
        <Link to="/studio/guide" className="inline-flex h-11 items-center rounded-full border border-border bg-surface px-4 text-sm">
          آموزش و مراقبت
        </Link>
      </div>
    </Shell>
  );
}