import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CalendarDays, LayoutGrid, MapPinned, Store, UserRound } from "lucide-react";
import { SignedIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { t } from "@/lib/i18n";
import { saveAction } from "@/lib/save";

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
      to="/notifications"
      className="relative inline-flex size-11 items-center justify-center rounded-md border border-border bg-surface"
      aria-label={t("notifications")}
    >
      <Bell className="size-5" />
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
      className="inline-flex h-10 shrink-0 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-fg"
    >
      {t("navSignIn")}
    </Link>
  );
}

const headerLink =
  "inline-flex h-10 shrink-0 items-center rounded-md px-3 text-sm text-fg hover:bg-surface";
const tabClass =
  "flex min-h-14 flex-col items-center justify-center gap-1 py-2.5 text-[11px] text-muted";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
          <Link to="/" reloadDocument className="flex shrink-0 items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-fg">
              <Store className="size-5" />
            </span>
            <strong className="text-sm font-semibold">{t("appName")}</strong>
          </Link>
          <nav className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
            <Link to="/account" className={headerLink}>
              {t("navBookings")}
            </Link>
            <Link to="/dashboard" search={{}} className={headerLink}>
              {t("navCreate")}
            </Link>
            <Link to="/dashboard" search={{}} className={headerLink}>
              {t("navAccount")}
            </Link>
            <SignedIn>
              <NoticeBell />
            </SignedIn>
            <AuthSlot />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid grid-cols-5">
          <Link to="/" reloadDocument className={tabClass}>
            <MapPinned className="size-5" />
            {t("navMap")}
          </Link>
          <Link to="/" hash="cats" reloadDocument className={tabClass}>
            <LayoutGrid className="size-5" />
            {t("navCategories")}
          </Link>
          <Link to="/dashboard" search={{}} className={`${tabClass} text-primary`}>
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-fg shadow-md">
              <Store className="size-5" />
            </span>
            {t("navCreate")}
          </Link>
          <Link to="/account" className={tabClass}>
            <CalendarDays className="size-5" />
            {t("navBookings")}
          </Link>
          <Link to="/dashboard" search={{}} className={tabClass}>
            <UserRound className="size-5" />
            {t("navAccount")}
          </Link>
        </div>
      </nav>
    </div>
  );
}
