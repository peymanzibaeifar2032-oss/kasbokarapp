import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/layout/shell";
import { BusinessCard } from "@/components/business/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useFavorites } from "@/lib/favorites";
import { formatFaDateTime, bookingIcs, downloadTextFile } from "@/lib/format";
import { friendlyError, saveAction } from "@/lib/save";
import type { Booking, Business } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({ component: Account });

function Account() {
  const { user, isPending } = useCurrentUserState();
  const favs = useFavorites();
  const [tab, setTab] = useState<"bookings" | "saved" | "payments">("bookings");
  const [items, setItems] = useState<Booking[]>([]);
  const [saved, setSaved] = useState<Business[]>([]);

  useEffect(() => {
    if (!user) return;
    void saveAction<Booking[]>("myBookings")
      .then(setItems)
      .catch(() => setItems([]));
  }, [user]);

  useEffect(() => {
    if (tab !== "saved") return;
    void Promise.all(favs.ids.map((id) => saveAction<Business | null>("business", { id }))).then((rows) =>
      setSaved(rows.filter((x): x is Business => Boolean(x))),
    );
  }, [tab, favs.ids]);

  if (isPending) {
    return (
      <Shell>
        <div className="h-32 animate-pulse rounded-2xl bg-surface" />
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn next="/account" />;

  return (
    <Shell>
      <h1 className="text-2xl font-semibold">حساب من</h1>
      <p className="mt-1 text-sm">
        وارد شده‌اید: <strong>{user.displayName || user.primaryEmail || "حساب شما"}</strong>
      </p>
      <p className="mt-1 text-sm text-muted">رزروها و مکان‌های ذخیره‌شده.</p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          className={cn("h-11 rounded-full border px-4 text-sm", tab === "bookings" ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface")}
          onClick={() => setTab("bookings")}
        >
          رزروها
        </button>
        <button
          type="button"
          className={cn("h-11 rounded-full border px-4 text-sm", tab === "saved" ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface")}
          onClick={() => setTab("saved")}
        >
          ذخیره‌ها
        </button>
        <button
          type="button"
          className={cn("h-11 rounded-full border px-4 text-sm", tab === "payments" ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface")}
          onClick={() => setTab("payments")}
        >
          پرداخت‌های من
        </button>
      </div>

      {tab === "bookings" ? <MyBookings items={items} onChange={setItems} /> : null}
      {tab === "payments" ? <MyPayments /> : null}
      {tab === "saved" ? (
        <div className="mt-6 grid gap-3">
          {!saved.length ? (
            <p className="text-sm text-muted">هنوز جایی ذخیره نکرده‌اید. روی قلب کارت‌ها بزنید.</p>
          ) : null}
          {saved.map((b) => (
            <BusinessCard key={b.id} business={b} saved onToggleSave={favs.toggle} />
          ))}
        </div>
      ) : null}
    </Shell>
  );
}

function MyPayments() {
  const [rows, setRows] = useState<{ id: string; businessName: string; amountLabel: string; status: string; createdAt: string; reference: string | null }[]>([]);
  useEffect(() => {
    void saveAction<typeof rows>("myPayments").then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <div className="mt-6 grid gap-3">
      {!rows.length ? <p className="text-sm text-muted">پرداختی ندارید. رزرو بدون پرداخت مثل قبل کار می‌کند.</p> : null}
      {rows.map((p) => (
        <article key={p.id} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex justify-between gap-3">
            <strong>{p.businessName}</strong>
            <span>{p.amountLabel}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{p.status} · {formatFaDateTime(p.createdAt)}</p>
          {p.reference ? <p className="text-xs text-muted">{p.reference}</p> : null}
        </article>
      ))}
    </div>
  );
}

function MyBookings({ items, onChange }: { items: Booking[]; onChange: (rows: Booking[]) => void }) {
  const now = Date.now();
  const future = items.filter((b) => b.status !== "cancelled" && new Date(b.slotStart).getTime() >= now);
  const past = items.filter((b) => b.status !== "cancelled" && new Date(b.slotStart).getTime() < now);
  const cancelled = items.filter((b) => b.status === "cancelled");
  if (!items.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
        هنوز رزروی ندارید.
        <div className="mt-3">
          <Button asChild variant="outline">
            <Link to="/">کشف کسب‌وکارها</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-6">
      <BookingGroup title="آینده" rows={future} onChange={onChange} />
      <BookingGroup title="گذشته" rows={past} onChange={onChange} />
      <BookingGroup title="لغوشده" rows={cancelled} onChange={onChange} />
    </div>
  );
}

function BookingGroup({ title, rows, onChange }: { title: string; rows: Booking[]; onChange: (rows: Booking[]) => void }) {
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="mb-2 font-semibold">{title}</h2>
      <div className="grid gap-3">
        {rows.map((b) => (
          <article key={b.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex justify-between gap-3">
              <div>
                <Link to="/business/$id" params={{ id: b.businessId }} className="font-semibold">
                  {b.businessName}
                </Link>
                {b.serviceTitle ? <p className="text-sm text-muted">{b.serviceTitle}</p> : null}
                <p className="mt-1 text-sm">{formatFaDateTime(b.slotStart)}</p>
              </div>
              <Badge>{label(b.status)}</Badge>
            </div>
            {b.status === "done" ? (
              <Button asChild className="mt-3" size="sm" variant="outline">
                <Link to="/business/$id" params={{ id: b.businessId }}>
                  نظر بدهید
                </Link>
              </Button>
            ) : null}
            {b.status === "requested" || b.status === "confirmed" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    downloadTextFile(
                      `nobat-${b.id}.ics`,
                      bookingIcs({
                        title: `نوبت ${b.businessName}`,
                        startIso: typeof b.slotStart === "string" ? b.slotStart : new Date(b.slotStart).toISOString(),
                        minutes: b.slotEnd
                          ? Math.max(10, Math.round((new Date(b.slotEnd).getTime() - new Date(b.slotStart).getTime()) / 60000))
                          : 60,
                        location: b.businessName,
                        description: b.serviceTitle ?? "",
                      }),
                      "text/calendar;charset=utf-8",
                    );
                  }}
                >
                  افزودن به تقویم
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void saveAction("bookingStatus", { id: b.id, status: "cancelled" })
                      .then(() => saveAction<Booking[]>("myBookings").then(onChange))
                      .then(() => toast.success("رزرو لغو شد."))
                      .catch((err) => toast.error(friendlyError(err)));
                  }}
                >
                  لغو رزرو
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function label(s: Booking["status"]) {
  if (s === "requested") return "در انتظار تأیید";
  if (s === "confirmed") return "تأیید شده";
  if (s === "cancelled") return "لغو شده";
  if (s === "no_show") return "عدم مراجعه";
  return "انجام شده";
}
