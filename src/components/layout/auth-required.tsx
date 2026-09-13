import { Shell } from "@/components/layout/shell";

export function SignedOutPanel({
  title,
  next,
  error,
  loading,
  onRetry,
}: {
  title: string;
  next: string;
  error?: boolean;
  loading?: boolean;
  onRetry?: () => void;
}) {
  return (
    <Shell>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm">
        {error
          ? "بارگذاری پنل انجام نشد."
          : loading
            ? "در حال بررسی ورود…"
            : "برای مشاهده پنل وارد حساب شوید"}
      </p>
      <p className="mt-2 text-xs text-muted">اگر این صفحه خالی ماند، یک‌بار دادهٔ سایت را پاک کنید و دوباره باز کنید.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {error && onRetry ? (
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-4 text-sm"
            onClick={onRetry}
          >
            تلاش دوباره
          </button>
        ) : null}
        <a
          href={`/login?next=${encodeURIComponent(next)}`}
          className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-fg"
        >
          ورود / ثبت‌نام
        </a>
      </div>
    </Shell>
  );
}
