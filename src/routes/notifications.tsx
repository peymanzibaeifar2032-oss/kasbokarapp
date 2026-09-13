import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { SignedOutPanel } from "@/components/layout/auth-required";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatFaDateTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import { saveAction } from "@/lib/save";
import type { NotificationItem } from "@/lib/types";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, isPending, sessionError, retry } = useCurrentUserState();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!user) return;
    void saveAction<{ items: NotificationItem[] }>("notifications").then((r) => setItems(r.items ?? []));
  }, [user]);

  if (!user) {
    return (
      <SignedOutPanel
        title={t("navNotices")}
        next="/notifications"
        error={sessionError}
        loading={isPending}
        onRetry={retry}
      />
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("navNotices")}</h1>
        {items.some((n) => !n.readAt) ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void saveAction("notificationsRead", {}).then(() =>
                setItems((cur) => cur.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))),
              );
            }}
          >
            همه خوانده شد
          </Button>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3">
        {!items.length ? <p className="text-sm text-muted">اعلانی ندارید.</p> : null}
        {items.map((n) => (
          <article key={n.id} className="rounded-2xl border border-border bg-surface p-4">
            <strong>{n.title}</strong>
            <p className="mt-1 text-sm text-muted">{n.body}</p>
            <p className="mt-2 text-xs text-muted">{formatFaDateTime(n.createdAt)}</p>
            {n.businessId ? (
              <Link className="mt-2 inline-block text-sm text-accent" to="/business/$id" params={{ id: n.businessId }}>
                مشاهده کسب‌وکار
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </Shell>
  );
}
