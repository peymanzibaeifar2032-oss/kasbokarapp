import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isStudioOwnerEmail } from "@/lib/studio-owner";

export const Route = createFileRoute("/account")({ component: Account });

function Account() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const owner = isStudioOwnerEmail(user?.primaryEmail);

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