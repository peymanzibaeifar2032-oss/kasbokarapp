import { useEffect, useState, type ReactNode } from "react";
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
    <a
      href="/notifications"
      className="relative inline-flex size-11 items-center justify-center rounded-md border border-border bg-surface"
      aria-label={t("navNotices")}
      onClick={(e) => {
        e.preventDefault();
        window.location.assign("/notifications");
      }}
    >
      <Bell className="size-5" />
      {unread > 0 ? (
        <span className="absolute -left-1 -top-1 min-w-4 rounded-full bg-accent px-1 text-[10px] text-accent-fg">
          {unread > 9 ? "۹+" : new Intl.NumberFormat("fa-IR").format(unread)}
        </span>
      ) : null}
    </a>
  );
}

function HardLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.assign(href);
      }}
    >
      {children}
    </a>
  );
}

function AuthSlot() {
  const { user } = useCurrentUserState();
  if (user) return <UserButton />;
  return (
    <HardLink
      href="/login"
      className="inline-flex h-10 shrink-0 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-fg"
    >
      {t("navSignIn")}
    </HardLink>
  );
}

const headerLink =
  "inline-flex h-10 shrink-0 items-center rounded-md px-3 text-sm text-fg hover:bg-surface";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
          <HardLink href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-fg">
              <Store className="size-5" />
            </span>
            <strong className="text-sm font-semibold">{t("appName")}</strong>
          </HardLink>
          <nav className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
            <HardLink href="/account" className={headerLink}>
              {t("navBookings")}
            </HardLink>
            <HardLink href="/dashboard" className={headerLink}>
              {t("navCreate")}
            </HardLink>
            <HardLink href="/dashboard" className={headerLink}>
              {t("navAccount")}
            </HardLink>
            <SignedIn>
              <NoticeBell />
            </SignedIn>
            <AuthSlot />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
        style={{ transform: "translateZ(0)" }}
      >
        <div className="grid grid-cols-5">
          <HardLink href="/" className="flex min-h-14 flex-col items-center justify-center gap-1 py-2.5 text-[11px] text-muted">
            <MapPinned className="size-5" />
            {t("navMap")}
          </HardLink>
          <HardLink href="/#cats" className="flex min-h-14 flex-col items-center justify-center gap-1 py-2.5 text-[11px] text-muted">
            <LayoutGrid className="size-5" />
            {t("navCategories")}
          </HardLink>
          <HardLink href="/dashboard" className="flex min-h-14 flex-col items-center justify-center gap-1 py-2.5 text-[11px] text-primary">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-fg shadow-md">
              <Store className="size-5" />
            </span>
            {t("navCreate")}
          </HardLink>
          <HardLink href="/account" className="flex min-h-14 flex-col items-center justify-center gap-1 py-2.5 text-[11px] text-muted">
            <CalendarDays className="size-5" />
            {t("navBookings")}
          </HardLink>
          <HardLink href="/dashboard" className="flex min-h-14 flex-col items-center justify-center gap-1 py-2.5 text-[11px] text-muted">
            <UserRound className="size-5" />
            {t("navAccount")}
          </HardLink>
        </div>
      </nav>
    </div>
  );
}
