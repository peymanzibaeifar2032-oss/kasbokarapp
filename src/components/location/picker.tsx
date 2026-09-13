import { MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { searchPlaces } from "@/lib/server/api";
import { cn } from "@/lib/utils";

export type PickedPlace = {
  id: string;
  nameFa: string;
  type: string;
  typeFa: string;
  context: string;
  provinceName?: string | null;
  countyName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function LocationPicker({
  value,
  onChange,
  onUseGps,
  gpsActive,
  geoBusy,
}: {
  value: PickedPlace | null;
  onChange: (place: PickedPlace | null) => void;
  onUseGps?: () => void;
  gpsActive?: boolean;
  geoBusy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PickedPlace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const tmr = window.setTimeout(() => {
      setLoading(true);
      void searchPlaces({ data: { q } })
        .then((list) => {
          if (!cancelled) setRows(Array.isArray(list) ? (list as PickedPlace[]) : []);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [q, open]);

  const label = gpsActive
    ? t("useMyLocation")
    : value
      ? value.context
      : t("pickLocation");

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-right text-sm",
          value || gpsActive ? "border-primary bg-primary/5" : "border-border bg-surface",
        )}
      >
        <MapPin className="size-4 shrink-0 text-accent" />
        <span className="flex-1 truncate">{label}</span>
      </button>
      {onUseGps ? (
        <button
          type="button"
          onClick={onUseGps}
          className={cn(
            "h-11 w-full rounded-xl border text-sm",
            gpsActive ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface",
          )}
        >
          {geoBusy ? "در حال یافتن…" : t("useMyLocation")}
        </button>
      ) : null}
      {open ? (
        <div className="rounded-xl border border-border bg-surface p-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("placeSearch")}
              className="pr-10"
              autoComplete="off"
              autoFocus
            />
          </label>
          <ul className="mt-2 max-h-64 overflow-y-auto">
            {loading ? <li className="px-2 py-2 text-sm text-muted">در حال جست‌وجو…</li> : null}
            {!loading && rows.length === 0 ? (
              <li className="px-2 py-2 text-sm text-muted">مکانی با این نام پیدا نشد.</li>
            ) : null}
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-lg px-2 py-2 text-right hover:bg-accent/10"
                  onClick={() => {
                    onChange(row);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <span className="text-sm">
                    {row.nameFa}
                    <span className="mr-2 text-xs text-muted">{row.typeFa}</span>
                  </span>
                  <span className="text-xs text-muted">{row.context}</span>
                </button>
              </li>
            ))}
          </ul>
          {value ? (
            <button
              type="button"
              className="mt-2 w-full text-sm text-muted"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              پاک کردن موقعیت
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
