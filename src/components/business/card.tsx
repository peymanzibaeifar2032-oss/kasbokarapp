import { Link } from "@tanstack/react-router";
import { Heart, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/business/stars";
import { formatFaDateTime, formatKm, formatToman } from "@/lib/format";
import { isOpenNow, todayHoursLabel } from "@/lib/hours";
import { t } from "@/lib/i18n";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";

export function visibilityLabel(v: Business["visibility"]) {
  if (v === "trial") return { text: "آزمایشی", tone: "primary" as const };
  if (v === "subscribed") return { text: "فعال", tone: "accent" as const };
  if (v === "pending") return { text: "در انتظار تأیید", tone: "muted" as const };
  if (v === "rejected") return { text: "رد شده", tone: "danger" as const };
  return { text: "منقضی", tone: "danger" as const };
}

export function Cover({ slug, name, className }: { slug: string; name: string; className?: string }) {
  return (
    <div className={cn("biz-cover relative overflow-hidden", `biz-cover-${slug}`, className)}>
      <span className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:14px_14px]" />
      <strong className="relative text-lg">{name.slice(0, 1)}</strong>
    </div>
  );
}

export function BusinessCard({
  business,
  distanceKm,
  compact,
  saved,
  onToggleSave,
}: {
  business: Business;
  distanceKm?: number;
  compact?: boolean;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  const open = isOpenNow(business.workHours);
  const price = business.prices[0];
  const nextIso = business.nextFreeIso ?? null;
  return (
    <article
      id={`biz-${business.id}`}
      className="relative overflow-hidden rounded-xl border border-border bg-surface transition-transform duration-150 hover:-translate-y-0.5"
    >
      <Link to="/business/$id" params={{ id: business.id }} className="block">
        {!compact ? <Cover slug={business.categorySlug} name={business.name} className="h-24" /> : null}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">{business.categoryName}</p>
              <h3 className="mt-1 text-base font-semibold">{business.name}</h3>
              {business.jobTitle ? <p className="mt-0.5 text-sm text-muted">{business.jobTitle}</p> : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge tone={open ? "accent" : "muted"}>{open ? "باز است" : "بسته"}</Badge>
              {business.verificationLevel === "basic" ? (
                <Badge tone="muted">{t("verifiedBasic")}</Badge>
              ) : null}
            </div>
          </div>
          <div className="mt-2">
            <Stars value={business.ratingAvg} count={business.ratingCount} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-4" />
            {business.city}، {business.province}
            {distanceKm != null ? ` · ${formatKm(distanceKm)}` : null}
          </p>
          <p className="mt-1 text-xs text-muted">{todayHoursLabel(business.workHours)}</p>
          {business.offerText ? (
            <p className="mt-2 text-sm font-medium text-accent">{business.offerText}</p>
          ) : null}
          {!compact && price ? (
            <p className="mt-2 text-sm font-medium">
              {formatToman(price.price)} · {price.title}
            </p>
          ) : null}
          {nextIso ? (
            <p className="mt-1 text-xs text-muted">
              {t("nextFree")}: {formatFaDateTime(nextIso)}
            </p>
          ) : null}
        </div>
      </Link>
      {onToggleSave ? (
        <button
          type="button"
          aria-label={saved ? "حذف از ذخیره‌ها" : "ذخیره"}
          className={cn(
            "absolute top-3 left-3 grid size-11 place-items-center rounded-full border border-border bg-surface/95",
            saved && "text-danger",
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(business.id);
          }}
        >
          <Heart className={cn("size-4", saved && "fill-current")} />
        </button>
      ) : null}
    </article>
  );
}
