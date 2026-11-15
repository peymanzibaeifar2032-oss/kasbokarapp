/**
 * Owner-only apprentice report: every activation code (with or without activity), its devices, which lessons it
 * opened and finished, and its progress against the lessons an apprentice can see now. Pure, so it is tested
 * without a database; the store only feeds it rows.
 */

/** The owner's own sign-in code («ورود خودم») is listed, but last and marked, so it never looks like an apprentice. */
export const OWNER_CODE_NOTE = "ورود خودم";

export type StatsCodeRow = {
  id: string;
  code: string;
  note: string;
  isActive: boolean;
  maxDevices: number;
  usedCount: number;
  expiresAt: string | Date | null;
  createdAt: string | Date | null;
};

export type StatsAccessRow = {
  codeId: string;
  deviceId: string;
  activatedAt: string | Date | null;
  lastSeen: string | Date | null;
  isBlocked: boolean;
};

/** One row per (code, lesson) from tattoo_lesson_events. */
export type StatsEventRow = {
  codeId: string;
  lessonId: string;
  opens: number;
  firstOpenAt: string | Date | null;
  lastOpenAt: string | Date | null;
  completedAt: string | Date | null;
};

/** A lesson the apprentice can see, in class-index order. */
export type StatsLesson = { id: string; seq: number; title: string; partId: string; partTitle: string; chapterTitle: string };
export type StatsPart = { id: string; title: string; level: string };

export type ApprenticeLesson = {
  lessonId: string;
  seq: number | null;
  title: string;
  partTitle: string;
  chapterTitle: string;
  /** False when the lesson is no longer visible to apprentices (hidden, deleted or renamed away). */
  visible: boolean;
  opens: number;
  firstOpenAt: string | null;
  lastOpenAt: string | null;
  completedAt: string | null;
};

export type ApprenticePart = { partId: string; title: string; level: string; total: number; opened: number; completed: number; percent: number };

export type ApprenticeDevice = { device: string; activatedAt: string | null; lastSeen: string | null; isBlocked: boolean };

export type ApprenticeStatus = "active" | "inactive" | "expired";

export type ApprenticeRow = {
  codeId: string;
  code: string;
  label: string;
  note: string;
  isOwnerCode: boolean;
  status: ApprenticeStatus;
  createdAt: string | null;
  expiresAt: string | null;
  maxDevices: number;
  devicesUsed: number;
  devicesBlocked: number;
  devices: ApprenticeDevice[];
  opened: number;
  completed: number;
  total: number;
  percent: number;
  lastActivityAt: string | null;
  lastLessonTitle: string | null;
  parts: ApprenticePart[];
  lessons: ApprenticeLesson[];
};

export type ApprenticeReport = {
  apprentices: ApprenticeRow[];
  totals: { codes: number; activeCodes: number; withDevice: number; withActivity: number; totalLessons: number; averagePercent: number };
  timeZone: "Asia/Tehran";
};

function iso(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function latest(...values: (string | null)[]): string | null {
  let best: string | null = null;
  for (const value of values) if (value && (!best || value > best)) best = value;
  return best;
}

function percent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

/** TT-RZLS-MW22-28 -> TT-••••-28: enough for the owner to tell codes apart in a screenshot, never the whole code. */
export function maskCode(code: string) {
  const parts = code.split("-").filter(Boolean);
  if (parts.length < 2) return code.length > 4 ? `••••${code.slice(-2)}` : "••••";
  return `${parts[0]}-••••-${parts[parts.length - 1].slice(-2)}`;
}

/** Only the end of a device id: enough to tell two phones apart. */
export function deviceTail(deviceId: string) {
  const clean = deviceId.trim();
  return clean.length > 6 ? `…${clean.slice(-6)}` : clean;
}

export function codeStatus(row: Pick<StatsCodeRow, "isActive" | "expiresAt">, now = Date.now()): ApprenticeStatus {
  if (!row.isActive) return "inactive";
  const expires = iso(row.expiresAt);
  if (expires && new Date(expires).getTime() < now) return "expired";
  return "active";
}

export function buildApprenticeReport(input: {
  codes: StatsCodeRow[];
  access: StatsAccessRow[];
  events: StatsEventRow[];
  lessons: StatsLesson[];
  parts: StatsPart[];
  /** Titles for lessons that had activity but are no longer in the visible list. */
  titles?: Record<string, string>;
  now?: number;
}): ApprenticeReport {
  const now = input.now ?? Date.now();
  const lessonById = new Map(input.lessons.map((lesson) => [lesson.id, lesson]));
  const total = input.lessons.length;
  const partTotals = new Map<string, number>();
  for (const lesson of input.lessons) partTotals.set(lesson.partId, (partTotals.get(lesson.partId) ?? 0) + 1);

  const accessByCode = new Map<string, StatsAccessRow[]>();
  for (const row of input.access) {
    const list = accessByCode.get(row.codeId);
    if (list) list.push(row);
    else accessByCode.set(row.codeId, [row]);
  }
  const eventsByCode = new Map<string, StatsEventRow[]>();
  for (const row of input.events) {
    const list = eventsByCode.get(row.codeId);
    if (list) list.push(row);
    else eventsByCode.set(row.codeId, [row]);
  }

  const apprentices = input.codes.map((code): ApprenticeRow => {
    const devices = (accessByCode.get(code.id) ?? [])
      .map((row) => ({ device: deviceTail(row.deviceId), activatedAt: iso(row.activatedAt), lastSeen: iso(row.lastSeen), isBlocked: Boolean(row.isBlocked) }))
      .sort((a, b) => String(b.lastSeen || "").localeCompare(String(a.lastSeen || "")));
    const lessons = (eventsByCode.get(code.id) ?? []).map((row): ApprenticeLesson => {
      const known = lessonById.get(row.lessonId);
      return {
        lessonId: row.lessonId,
        seq: known?.seq ?? null,
        title: known?.title || input.titles?.[row.lessonId] || row.lessonId,
        partTitle: known?.partTitle ?? "",
        chapterTitle: known?.chapterTitle ?? "",
        visible: Boolean(known),
        opens: Number(row.opens) || 0,
        firstOpenAt: iso(row.firstOpenAt),
        lastOpenAt: iso(row.lastOpenAt),
        completedAt: iso(row.completedAt),
      };
    });
    lessons.sort((a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title));
    const visible = lessons.filter((lesson) => lesson.visible);
    const completed = visible.filter((lesson) => lesson.completedAt).length;
    const opened = visible.filter((lesson) => lesson.opens > 0 || lesson.completedAt).length;
    const parts = input.parts
      .filter((part) => (partTotals.get(part.id) ?? 0) > 0)
      .map((part) => {
        const mine = visible.filter((lesson) => lessonById.get(lesson.lessonId)?.partId === part.id);
        const done = mine.filter((lesson) => lesson.completedAt).length;
        const partTotal = partTotals.get(part.id) ?? 0;
        return {
          partId: part.id,
          title: part.title,
          level: part.level,
          total: partTotal,
          opened: mine.filter((lesson) => lesson.opens > 0 || lesson.completedAt).length,
          completed: done,
          percent: percent(done, partTotal),
        };
      });
    let lastLesson: ApprenticeLesson | null = null;
    let lastLessonAt: string | null = null;
    for (const lesson of lessons) {
      const at = latest(lesson.lastOpenAt, lesson.completedAt);
      if (at && (!lastLessonAt || at > lastLessonAt)) {
        lastLessonAt = at;
        lastLesson = lesson;
      }
    }
    const lastSeen = latest(...devices.map((device) => device.lastSeen));
    const note = (code.note || "").trim();
    return {
      codeId: code.id,
      code: code.code,
      label: note || maskCode(code.code),
      note,
      isOwnerCode: note === OWNER_CODE_NOTE,
      status: codeStatus(code, now),
      createdAt: iso(code.createdAt),
      expiresAt: iso(code.expiresAt),
      maxDevices: Number(code.maxDevices) || 0,
      devicesUsed: devices.length,
      devicesBlocked: devices.filter((device) => device.isBlocked).length,
      devices,
      opened,
      completed,
      total,
      percent: percent(completed, total),
      lastActivityAt: latest(lastLessonAt, lastSeen),
      lastLessonTitle: lastLesson?.title ?? null,
      parts,
      lessons,
    };
  });

  // Apprentices first; most recent activity first; codes never used after them (newest code first); owner code last.
  apprentices.sort((a, b) =>
    Number(a.isOwnerCode) - Number(b.isOwnerCode) ||
    String(b.lastActivityAt || "").localeCompare(String(a.lastActivityAt || "")) ||
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")) ||
    a.code.localeCompare(b.code),
  );

  const real = apprentices.filter((row) => !row.isOwnerCode);
  return {
    apprentices,
    totals: {
      codes: real.length,
      activeCodes: real.filter((row) => row.status === "active").length,
      withDevice: real.filter((row) => row.devicesUsed > 0).length,
      withActivity: real.filter((row) => row.lessons.length > 0).length,
      totalLessons: total,
      averagePercent: real.length ? Math.round(real.reduce((n, row) => n + row.percent, 0) / real.length) : 0,
    },
    timeZone: "Asia/Tehran",
  };
}

/** Visible lessons and parts from the class index (only lessons an apprentice can open count toward progress). */
export function lessonsFromIndex(index: {
  parts: { id: string; title: string; level: string; chapters: { title: string; lessons: { id: string; seq: number; title: string; published: boolean }[] }[] }[];
}): { lessons: StatsLesson[]; parts: StatsPart[] } {
  const lessons: StatsLesson[] = [];
  for (const part of index.parts) {
    for (const chapter of part.chapters) {
      for (const lesson of chapter.lessons) {
        if (!lesson.published) continue;
        lessons.push({ id: lesson.id, seq: lesson.seq, title: lesson.title, partId: part.id, partTitle: part.title, chapterTitle: chapter.title });
      }
    }
  }
  return { lessons, parts: index.parts.map((part) => ({ id: part.id, title: part.title, level: part.level })) };
}
