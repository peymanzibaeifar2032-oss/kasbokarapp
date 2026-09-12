import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { visibilityLabel } from "@/components/business/card";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { guideRequest, type GuideBugListItem } from "@/lib/guide/client";
import { formatFaDateTime } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import type { Business, Profile } from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Business[]>([]);
  const [tab, setTab] = useState<"biz" | "bugs">("biz");
  const [bugs, setBugs] = useState<GuideBugListItem[]>([]);

  useEffect(() => {
    if (!user) return;
    void saveAction<Profile>("profile").then((p) => {
      setProfile(p);
      if (p.isAdmin) {
        void saveAction<Business[]>("adminList").then(setItems);
        void guideRequest<{ items: GuideBugListItem[] }>("bugs")
          .then((r) => setBugs(r.items))
          .catch(() => setBugs([]));
      }
    });
  }, [user]);

  if (isPending) {
    return (
      <Shell>
        <div className="h-32 animate-pulse rounded-2xl bg-surface" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn next="/admin" />;
  if (profile && !profile.isAdmin) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">مدیریت</h1>
        <p className="mt-2 text-sm text-muted">این بخش فقط برای مدیر محصول است.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold">مدیریت</h1>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={cn(
            "h-11 rounded-full border px-4 text-sm",
            tab === "biz" ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface",
          )}
          onClick={() => setTab("biz")}
        >
          تأیید کسب‌وکارها
        </button>
        <button
          type="button"
          className={cn(
            "h-11 rounded-full border px-4 text-sm",
            tab === "bugs" ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface",
          )}
          onClick={() => setTab("bugs")}
        >
          گزارش باگ
        </button>
      </div>

      {tab === "biz" ? (
        <>
          <p className="mt-4 text-sm text-muted">پس از تأیید، ۷ روز نمایش رایگان شروع می‌شود.</p>
          <div className="mt-4 grid gap-3">
            {items.map((b) => {
              const vis = visibilityLabel(b.visibility);
              return (
                <article key={b.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{b.name}</h2>
                      <p className="text-sm text-muted">
                        {b.city}، {b.province} · {b.categoryName}
                      </p>
                      {b.phone ? <p className="text-sm">{b.phone}</p> : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={vis.tone}>{vis.text}</Badge>
                      {b.verificationLevel === "basic" ? (
                        <Badge tone="muted">{t("verifiedBasic")}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/business/$id" params={{ id: b.id }}>
                        مشاهده صفحه
                      </Link>
                    </Button>
                    {b.approvalStatus === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            void saveAction("adminDecide", { id: b.id, decision: "approved" })
                              .then(() => saveAction<Business[]>("adminList").then(setItems))
                              .then(() => toast.success("تأیید شد."))
                              .catch((err) => toast.error(friendlyError(err)));
                          }}
                        >
                          تأیید
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void saveAction("adminDecide", { id: b.id, decision: "rejected" })
                              .then(() => saveAction<Business[]>("adminList").then(setItems))
                              .catch((err) => toast.error(friendlyError(err)));
                          }}
                        >
                          رد
                        </Button>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <BugsPanel
          items={bugs}
          onChange={() =>
            void guideRequest<{ items: GuideBugListItem[] }>("bugs").then((r) => setBugs(r.items))
          }
        />
      )}
    </Shell>
  );
}

function severityTone(s: string): "muted" | "accent" | "danger" {
  if (s === "critical") return "danger";
  if (s === "medium") return "accent";
  return "muted";
}

function roleFa(role: string) {
  if (role === "owner") return "صاحب کسب‌وکار";
  if (role === "admin") return "مدیر";
  if (role === "user") return "کاربر";
  return "مهمان";
}

function BugsPanel({ items, onChange }: { items: GuideBugListItem[]; onChange: () => void }) {
  if (!items.length) {
    return <p className="mt-6 text-sm text-muted">هنوز گزارش باگی نیست.</p>;
  }
  return (
    <div className="mt-4 grid gap-3">
      {items.map((b) => (
        <article key={b.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{b.intent}</p>
              <p className="mt-1 text-xs text-muted">
                {formatFaDateTime(b.createdAt)} · {roleFa(b.role)} · {b.routePath || b.pageUrl}
              </p>
            </div>
            <div className="flex gap-1">
              <Badge tone={severityTone(b.severity)}>{b.severity}</Badge>
              <Badge>{b.status}</Badge>
            </div>
          </div>
          <p className="mt-2 text-muted">انتظار: {b.expected}</p>
          <p className="mt-1">واقعیت: {b.actual}</p>
          {b.steps ? <p className="mt-2 whitespace-pre-wrap text-muted">مراحل: {b.steps}</p> : null}
          <dl className="mt-3 grid gap-1 text-xs leading-6 text-muted">
            <div>
              گزارش‌دهنده: {b.reporterEmail || "مهمان"}
              {b.userId ? ` · شناسه ${b.userId}` : ""}
            </div>
            <div>نقش در فرم: {roleFa(b.role)}</div>
            <div>مسیر صفحه: {b.routePath || b.pageUrl}</div>
            <div>گفتگو: {b.conversationId || "—"}</div>
            <div>
              پیوست بعدی:{" "}
              {b.attachmentUrl ? (
                <a className="text-accent underline" href={b.attachmentUrl} target="_blank" rel="noreferrer">
                  مشاهده پیوند
                </a>
              ) : (
                "هنوز پیوندی نیست"
              )}
            </div>
            <div>اعلان: {b.notifiedAt ? `ارسال شد · ${formatFaDateTime(b.notifiedAt)}` : "فقط در دیتابیس"}</div>
            <div>{[b.device, b.browser, b.appVersion].filter(Boolean).join(" · ")}</div>
          </dl>
          <NativeSelect
            className="mt-3 max-w-xs"
            value={b.status}
            onChange={(e) => {
              void guideRequest("bugStatus", { id: b.id, status: e.target.value })
                .then(() => {
                  toast.success("وضعیت به‌روز شد.");
                  onChange();
                })
                .catch((err) => toast.error(friendlyError(err)));
            }}
          >
            <option value="new">جدید</option>
            <option value="reviewing">در بررسی</option>
            <option value="resolved">حل‌شده</option>
            <option value="closed">بسته</option>
          </NativeSelect>
        </article>
      ))}
    </div>
  );
}
