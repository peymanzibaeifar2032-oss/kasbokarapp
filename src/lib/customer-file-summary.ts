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

export type FileRelation = {
  title: string;
  finding: string;
  rows: string[];
};

export type CustomerFileSummary = {
  files: number;
  filled: number;
  averageToleranceHours: number | null;
  toleranceCount: number;
  relations: FileRelation[];
};

function fa(value: number) {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return text.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function skinLabel(value: string) {
  if (value === "روشن") return "پوست روشن (سفید)";
  if (value === "گندمی") return "پوست گندمی (سبزه)";
  if (value === "تیره") return "پوست تیره";
  return value;
}

function hoursOf(row: FileSample) {
  return TOLERANCE_HOURS[row.toleranceHours] ?? null;
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function groupBy(rows: FileSample[], field: keyof FileSample, labelOf: (value: string) => string = (value) => value) {
  const grouped = new Map<string, FileSample[]>();
  for (const row of rows) {
    const value = String(row[field] ?? "").trim();
    if (!value || value === "نمی‌داند") continue;
    grouped.set(value, [...(grouped.get(value) ?? []), row]);
  }
  return [...grouped.entries()].map(([key, list]) => ({ key, label: labelOf(key), rows: list }));
}

function share(rows: FileSample[], field: keyof FileSample, values: string[]) {
  const known = rows.filter((row) => String(row[field] ?? "").trim());
  if (!known.length) return null;
  const hit = known.filter((row) => values.includes(String(row[field]))).length;
  return { hit, known: known.length };
}

function hourLine(rows: FileSample[]) {
  const avg = average(rows.map(hoursOf).filter((value): value is number => value != null));
  return avg == null ? "" : `میانگین تحمل ${fa(avg)} ساعت`;
}

function painLine(rows: FileSample[]) {
  const easy = share(rows, "pain", ["درد را راحت تحمل می‌کند"]);
  const hard = share(rows, "pain", ["زود خسته می‌شود"]);
  if (!easy || !hard) return "";
  if (easy.hit === 0 && hard.hit === 0) return "";
  if (hard.hit > easy.hit) return "بیشتر زود خسته شده‌اند";
  if (easy.hit > hard.hit) return "بیشتر درد را راحت تحمل کرده‌اند";
  return "تحمل دردشان مخلوط بوده";
}

function inkLine(rows: FileSample[]) {
  const hard = share(rows, "inkHold", ["سخت رنگ می‌گیرد", "رنگ نمی‌گیرد"]);
  const good = share(rows, "inkHold", ["خوب رنگ می‌گیرد"]);
  if (!hard || !good) return "";
  if (hard.hit > good.hit) return "رنگ سخت‌تر نشسته";
  if (good.hit > hard.hit) return "رنگ بهتر نشسته";
  return "رنگ‌گرفتنشان مخلوط بوده";
}

function fadeLine(rows: FileSample[]) {
  const fast = share(rows, "fade", ["زود کمرنگ می‌شود"]);
  const stays = share(rows, "fade", ["ماندگار می‌ماند"]);
  if (!fast || !stays) return "";
  if (fast.hit > stays.hit) return "رنگ زودتر کمرنگ شده";
  if (stays.hit > fast.hit) return "رنگ ماندگارتر بوده";
  return "ماندن رنگشان مخلوط بوده";
}

function detail(rows: FileSample[]) {
  return [hourLine(rows), painLine(rows), inkLine(rows), fadeLine(rows)].filter(Boolean).join("، ");
}

function compareHours(title: string, groups: { label: string; rows: FileSample[] }[]): FileRelation | null {
  const measured = groups
    .map((group) => ({ ...group, avg: average(group.rows.map(hoursOf).filter((value): value is number => value != null)) }))
    .filter((group) => group.avg != null);
  if (measured.length < 2) return null;
  const ranked = [...measured].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  const high = ranked[0];
  const low = ranked[ranked.length - 1];
  const gap = (high.avg ?? 0) - (low.avg ?? 0);
  const finding = gap >= 1
    ? `${high.label} درد را بیشتر کشیده و میانگین تحملش ${fa(high.avg ?? 0)} ساعت است. ${low.label} زودتر به آخر تحمل رسیده و میانگینش ${fa(low.avg ?? 0)} ساعت است.`
    : `بین ${high.label} و ${low.label} فرق روشنی در ساعت تحمل نیست. هر دو حول ${fa(high.avg ?? 0)} ساعت مانده‌اند.`;
  return {
    title,
    finding,
    rows: groups.map((group) => `${group.label}: ${detail(group.rows) || "برای مقایسه هنوز تحمل یا رنگ ثبت نشده"}`),
  };
}

function compareRate(
  title: string,
  groups: { label: string; rows: FileSample[] }[],
  field: keyof FileSample,
  hardValues: string[],
  hardWord: string,
  easyWord: string,
): FileRelation | null {
  const measured = groups
    .map((group) => ({ ...group, rate: share(group.rows, field, hardValues) }))
    .filter((group) => group.rate && group.rate.known > 0);
  if (measured.length < 2) return null;
  const ranked = [...measured].sort((a, b) => (b.rate?.hit ?? 0) / (b.rate?.known ?? 1) - (a.rate?.hit ?? 0) / (a.rate?.known ?? 1));
  const high = ranked[0];
  const low = ranked[ranked.length - 1];
  const highRate = (high.rate?.hit ?? 0) / (high.rate?.known ?? 1);
  const lowRate = (low.rate?.hit ?? 0) / (low.rate?.known ?? 1);
  const finding = highRate - lowRate >= 0.25
    ? `${high.label} بیشتر ${hardWord}. ${low.label} بیشتر ${easyWord}.`
    : `در ${hardWord}، فرق روشنی بین ${high.label} و ${low.label} دیده نمی‌شود.`;
  return {
    title,
    finding,
    rows: groups.map((group) => `${group.label}: ${detail(group.rows) || "برای این مقایسه هنوز ثبت نشده"}`),
  };
}

export function summarizeCustomerFiles(rows: FileSample[]): CustomerFileSummary {
  const useful = rows.filter((row) =>
    row.skinTone || row.inkHold || row.fade || row.alcohol || row.pain || row.healing || row.numbing || row.bleeding || row.bloodType || row.toleranceHours || row.hydration,
  );
  const hours = useful.map(hoursOf).filter((value): value is number => value != null);
  const skins = groupBy(useful, "skinTone", skinLabel);
  const blood = groupBy(useful, "bloodType", (value) => `گروه ${value}`);
  const water = groupBy(useful, "hydration");
  const drink = groupBy(useful, "alcohol");
  const numb = groupBy(useful, "numbing");
  const relations = [
    compareHours("پوست و درد", skins),
    compareRate("پوست و نشستن رنگ", skins, "inkHold", ["سخت رنگ می‌گیرد", "رنگ نمی‌گیرد"], "سخت رنگ گرفته", "رنگ را بهتر گرفته"),
    compareRate("پوست و ماندن رنگ", skins, "fade", ["زود کمرنگ می‌شود"], "زود کمرنگ شده", "رنگ را نگه داشته"),
    compareHours("گروه خونی و درد", blood),
    compareRate("آب پوست و نشستن رنگ", water, "inkHold", ["سخت رنگ می‌گیرد", "رنگ نمی‌گیرد"], "سخت رنگ گرفته", "رنگ را بهتر گرفته"),
    compareRate("مشروب و نشستن رنگ", drink, "inkHold", ["سخت رنگ می‌گیرد", "رنگ نمی‌گیرد"], "سخت رنگ گرفته", "رنگ را بهتر گرفته"),
    compareRate("بی‌حسی و خونریزی", numb, "bleeding", ["زیاد"], "خونریزی زیاد داشته", "خونریزی کم یا معمولی داشته"),
  ].filter((item): item is FileRelation => Boolean(item));
  return {
    files: rows.length,
    filled: useful.length,
    averageToleranceHours: average(hours),
    toleranceCount: hours.length,
    relations,
  };
}
