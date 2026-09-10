import { cn } from "@/lib/utils";

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M10 1.6 12.4 7l5.9.5-4.5 3.9 1.4 5.8L10 14.8 4.8 17.2l1.4-5.8L1.7 7.5 7.6 7 10 1.6z"
      />
    </svg>
  );
}

export function Stars({
  value,
  count,
  size = "sm",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const v = Math.max(0, Math.min(5, value));
  const dim = size === "md" ? "size-4" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-1.5", size === "md" ? "text-sm" : "text-xs")}>
      <span className="relative inline-flex" aria-hidden>
        <span className="flex text-border">
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon key={i} className={dim} />
          ))}
        </span>
        <span className="absolute inset-0 flex overflow-hidden text-accent" style={{ width: `${(v / 5) * 100}%` }}>
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon key={i} className={cn(dim, "shrink-0")} />
          ))}
        </span>
      </span>
      {value > 0 ? (
        <span className="tabular-nums text-fg">
          {new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(Number(v.toFixed(1)))}
        </span>
      ) : (
        <span className="text-muted">بدون امتیاز</span>
      )}
      {count != null && count > 0 ? (
        <span className="text-muted">({new Intl.NumberFormat("fa-IR").format(count)})</span>
      ) : null}
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="امتیاز">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={cn("grid size-11 place-items-center", n <= value ? "text-accent" : "text-border")}
          onClick={() => onChange(n)}
        >
          <StarIcon className="size-6" />
        </button>
      ))}
    </div>
  );
}
