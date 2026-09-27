export type CustomerFileBrief = {
  skinTone: string;
  inkHold: string;
  fade: string;
  alcohol: string;
  sleepNote: string;
  arrival: string;
  pain: string;
  healing: string;
  notes: string;
  numbing: string;
  bleeding: string;
  sensitivity: string;
  bloodType: string;
  toleranceHours: string;
  hydration: string;
};

const TOLERANCE_MINUTES: Record<string, number> = {
  "۲ ساعت": 120,
  "۳ ساعت": 180,
  "۴ ساعت": 240,
  "۵ ساعت": 300,
  "۶ ساعت": 360,
};

export function toleranceMinutes(value: string) {
  return TOLERANCE_MINUTES[value] ?? null;
}

export function customerFileLines(file: CustomerFileBrief) {
  return [
    file.toleranceHours ? `تحمل جلسه: ${file.toleranceHours}` : "",
    file.pain,
    file.bloodType ? `گروه خونی: ${file.bloodType}` : "",
    file.numbing ? `بی‌حسی: ${file.numbing}` : "",
    file.skinTone ? `پوست ${file.skinTone}` : "",
    file.hydration,
    file.inkHold,
    file.fade,
    file.bleeding ? `خونریزی ${file.bleeding}` : "",
    file.alcohol,
    file.sleepNote ? `خواب: ${file.sleepNote}` : "",
    file.arrival,
    file.healing,
    file.sensitivity,
    file.notes,
  ].filter(Boolean);
}

export function CustomerFileDetails({ file, pending, showEmpty }: { file: CustomerFileBrief | null; pending?: boolean; showEmpty?: boolean }) {
  if (pending) return <p className="mt-3 text-sm text-muted">در حال پیدا کردن پرونده…</p>;
  if (!file && !showEmpty) return null;
  const lines = file ? customerFileLines(file) : [];
  const minutes = file ? toleranceMinutes(file.toleranceHours) : null;
  return (
    <aside className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <h3 className="text-sm font-bold">جزئیات پرونده مشتری</h3>
      {lines.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {lines.filter((line) => line !== file?.notes && line.length < 48).map((line) => (
            <span key={line} className="rounded-full border border-primary/20 bg-bg px-3 py-1 text-xs leading-6">
              {line}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm leading-7 text-muted">برای این شماره هنوز پرونده‌ای ذخیره نشده.</p>
      )}
      {file?.notes ? <p className="mt-3 text-sm leading-7">{file.notes}</p> : null}
      {lines.filter((line) => line.length >= 48 && line !== file?.notes).map((line) => (
        <p key={line} className="mt-2 text-sm leading-7">{line}</p>
      ))}
      {minutes && file ? (
        <p className="mt-2 text-sm font-semibold leading-7">
          بیشتر از {file.toleranceHours} برایش وقت نگذار. اگر کار کوتاه‌تری هم داری، می‌تواند همان روز، کار دوم باشد.
        </p>
      ) : null}
    </aside>
  );
}
