const TOLERANCE_HOURS: Record<string, number> = {
  "۲ ساعت": 2,
  "۳ ساعت": 3,
  "۴ ساعت": 4,
  "۵ ساعت": 5,
  "۶ ساعت": 6,
};

export type FileSample = {
  skinTone: string;
  inkHold: string;
  fade: string;
  alcohol: string;
  arrival: string;
  pain: string;
  healing: string;
  numbing: string;
  bleeding: string;
  bloodType: string;
  toleranceHours: string;
  hydration: string;
  sensitivity: string;
  notes: string;
  hasHealedImage: boolean;
};

export type FileCount = { label: string; count: number };
export type FileGroup = { title: string; rows: FileCount[] };

export type CustomerFileSummary = {
  files: number;
  filled: number;
  averageToleranceHours: number | null;
  toleranceCount: number;
  groups: FileGroup[];
  lines: string[];
};

const GROUPS: { title: string; field: keyof FileSample }[] = [
  { title: "رنگ پوست", field: "skinTone" },
  { title: "گرفتن رنگ", field: "inkHold" },
  { title: "ماندن رنگ", field: "fade" },
  { title: "آب پوست", field: "hydration" },
  { title: "بی‌حسی", field: "numbing" },
  { title: "خونریزی", field: "bleeding" },
  { title: "تحمل درد", field: "pain" },
  { title: "ساعت تحمل", field: "toleranceHours" },
  { title: "ترمیم", field: "healing" },
  { title: "مشروب", field: "alcohol" },
  { title: "رسیدن به استودیو", field: "arrival" },
  { title: "گروه خونی", field: "bloodType" },
];

function tally(rows: FileSample[], field: keyof FileSample): FileCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[field] ?? "").trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fa"));
}

function lead(group: FileGroup, filled: number) {
  const top = group.rows[0];
  if (!top || filled <= 0) return "";
  return `${group.title}: بیشتر «${top.label}» است، ${top.count} از ${filled}.`;
}

export function summarizeCustomerFiles(rows: FileSample[]): CustomerFileSummary {
  const filled = rows.filter((row) =>
    GROUPS.some((group) => String(row[group.field] ?? "").trim()) || row.sensitivity.trim() || row.notes.trim() || row.hasHealedImage,
  ).length;
  const groups = GROUPS.map((group) => ({ title: group.title, rows: tally(rows, group.field) })).filter((group) => group.rows.length);
  const hours = rows.map((row) => TOLERANCE_HOURS[row.toleranceHours]).filter((value): value is number => value != null);
  const averageToleranceHours = hours.length ? Math.round((hours.reduce((sum, value) => sum + value, 0) / hours.length) * 10) / 10 : null;
  const lines = [
    filled ? `${filled} پرونده از ${rows.length} پرونده اطلاعات تاتو دارد.` : "هنوز اطلاعاتی در پرونده‌ها ذخیره نشده.",
    ...groups.map((group) => lead(group, filled)).filter(Boolean),
    averageToleranceHours != null ? `میانگین تحمل جلسه ${averageToleranceHours} ساعت است، از ${hours.length} پرونده.` : "",
    tally(rows, "sensitivity").length ? `${tally(rows, "sensitivity").reduce((sum, row) => sum + row.count, 0)} پرونده دارو یا حساسیت پوست دارد.` : "",
    rows.filter((row) => row.hasHealedImage).length ? `${rows.filter((row) => row.hasHealedImage).length} پرونده عکس بعد از ترمیم دارد.` : "",
  ].filter(Boolean);
  return { files: rows.length, filled, averageToleranceHours, toleranceCount: hours.length, groups, lines };
}
