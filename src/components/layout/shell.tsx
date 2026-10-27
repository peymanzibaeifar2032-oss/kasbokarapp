import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Mark } from "@/components/studio/marks";
import { SignedIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveAction } from "@/lib/save";
import { isStudioOwnerEmail } from "@/lib/studio-owner";

function NoticeBell() {
  const { user } = useCurrentUserState();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) return;
    void saveAction<{ unread: number }>("notifications")
      .then((r) => setUnread(r.unread || 0))
      .catch(() => setUnread(0));
  }, [user]);
  if (!user) return null;
  return (
    <Link
      to="/studio/status"
      className="relative inline-flex size-11 items-center justify-center rounded-md border border-border bg-surface"
      aria-label="وضعیت نوبت"
    >
      <Mark name="bell" className="size-5" />
      {unread > 0 ? (
        <span className="absolute -left-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-[10px] text-accent-fg">
          {unread > 9 ? "۹+" : new Intl.NumberFormat("fa-IR").format(unread)}
        </span>
      ) : null}
    </Link>
  );
}

function AuthSlot() {
  const { user } = useCurrentUserState();
  if (user) return <UserButton />;
  return (
    <Link
      to="/login"
      search={{ next: "/studio/request" }}
      className="inline-flex h-10 shrink-0 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-fg"
    >
      ورود
    </Link>
  );
}

const headerLink =
  "inline-flex h-10 shrink-0 items-center gap-1 rounded-md px-3 text-sm text-fg hover:bg-surface";
const tabClass =
  "flex min-h-14 flex-col items-center justify-center gap-1 py-2.5 text-[11px] text-muted";

const SITE_MENU = [
  { to: "/studio", label: "استودیو" },
  { to: "/studio/request", label: "درخواست نوبت" },
  { to: "/studio/status", label: "پیگیری" },
  { to: "/studio/designs", label: "طرح‌ها" },
  { to: "/studio/care", label: "مراقبت" },
  { to: "/studio/guide", label: "آموزش" },
  { to: "/studio/club", label: "باشگاه" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  const owner = isStudioOwnerEmail(user?.primaryEmail);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
          <button
            type="button"
            className="inline-flex size-11 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface"
            aria-label="منوی سایت"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span className="h-0.5 w-4 rounded-full bg-current" />
            <span className="h-0.5 w-4 rounded-full bg-current" />
            <span className="h-0.5 w-4 rounded-full bg-current" />
          </button>
          <Link to="/studio" className="flex shrink-0 items-center gap-2">
            <img src="/apps/tattoo-app-icon.png" alt="" className="size-9 rounded-lg" />
            <strong className="text-sm font-semibold">رزرو وقت تاتو</strong>
          </Link>
          <nav className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
            <Link to="/studio/request" className={headerLink}>
              <Mark name="request" className="size-4" />
              درخواست
            </Link>
            <Link to="/studio/status" className={headerLink}>
              <Mark name="status" className="size-4" />
              وضعیت
            </Link>
            {owner ? (
              <Link to="/studio/admin" className={headerLink}>
                پنل مدیریت
              </Link>
            ) : null}
            <SignedIn>
              <NoticeBell />
            </SignedIn>
            <AuthSlot />
          </nav>
        </div>
      </header>
      {menuOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="بستن منو" onClick={() => setMenuOpen(false)} />
          <nav className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col gap-2 overflow-y-auto bg-bg p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-base font-black">بخش‌های سایت</p>
              <button type="button" className="h-11 rounded-xl px-3 text-sm font-bold" onClick={() => setMenuOpen(false)}>
                بستن
              </button>
            </div>
            {SITE_MENU.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex h-12 items-center rounded-2xl bg-surface px-3 text-sm font-bold"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {owner ? (
              <Link to="/studio/admin" className="flex h-12 items-center rounded-2xl bg-primary px-3 text-sm font-bold text-primary-fg" onClick={() => setMenuOpen(false)}>
                پنل مدیریت
              </Link>
            ) : (
              <Link to="/account" className="flex h-12 items-center rounded-2xl bg-surface px-3 text-sm font-bold" onClick={() => setMenuOpen(false)}>
                حساب
              </Link>
            )}
          </nav>
        </div>
      ) : null}
      <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-4 pb-28 pt-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid grid-cols-5">
          <Link to="/studio" className={tabClass}>
            <Mark name="studio" className="size-5" />
            استودیو
          </Link>
          <Link to="/studio/guide" className={tabClass}>
            <Mark name="guide" className="size-5" />
            آموزش
          </Link>
          <Link to="/studio/request" className={`${tabClass} text-primary`}>
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-fg shadow-md">
              <Mark name="request" className="size-5" />
            </span>
            درخواست
          </Link>
          <Link to="/studio/status" className={tabClass}>
            <Mark name="status" className="size-5" />
            وضعیت
          </Link>
          <Link to={owner ? "/studio/admin" : "/account"} className={tabClass}>
            <Mark name={owner ? "studio" : "contacts"} className="size-5" />
            {owner ? "مدیریت" : "حساب"}
          </Link>
        </div>
      </nav>
    </div>
  );
}