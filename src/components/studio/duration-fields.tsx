import { Input } from "@/components/ui/input";
import { toFaDigits } from "@/lib/calendar/jalali";

export function splitSitting(total: number) {
  const safe = Math.max(0, Math.round(total) || 0);
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

export function joinSitting(hours: string, minutes: string) {
  const h = Math.min(72, Math.max(0, Number(hours.replace(/\D/g, "")) || 0));
  const m = Math.min(59, Math.max(0, Number(minutes.replace(/\D/g, "")) || 0));
  return h * 60 + m;
}

export function formatSitting(total: number | null | undefined) {
  if (!total || total < 1) return "";
  const { hours, minutes } = splitSitting(total);
  if (hours && minutes) return `${toFaDigits(hours)} ساعت و ${toFaDigits(minutes)} دقیقه`;
  if (hours) return `${toFaDigits(hours)} ساعت`;
  return `${toFaDigits(minutes)} دقیقه`;
}

export function DurationFields({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const parts = splitSitting(minutes);
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">ساعت</span>
        <Input
          value={parts.hours ? String(parts.hours) : ""}
          onChange={(event) => onChange(joinSitting(event.target.value, String(parts.minutes || "")))}
          inputMode="numeric"
          placeholder="۵"
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">دقیقه</span>
        <Input
          value={parts.minutes ? String(parts.minutes) : ""}
          onChange={(event) => onChange(joinSitting(String(parts.hours || ""), event.target.value))}
          inputMode="numeric"
          placeholder="۲۰"
        />
      </label>
    </div>
  );
}
