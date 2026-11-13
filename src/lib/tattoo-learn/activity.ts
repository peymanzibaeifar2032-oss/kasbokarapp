/** Lesson activity from the class app: pure rules shared by the API, the store and tests. */
export const ACTIVITY_KINDS = ["open", "complete"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** An "open" is counted again only after this gap, so scrolling back and forth is not inflated. */
export const OPEN_GAP_MINUTES = 30;

export function isActivityKind(value: unknown): value is ActivityKind {
  return typeof value === "string" && (ACTIVITY_KINDS as readonly string[]).includes(value);
}

export type CodeActivityRow = {
  codeId: string;
  code: string;
  note: string;
  opens: number;
  completes: number;
  lessons: number;
  lastAt: string | null;
};

export type LessonActivityRow = {
  lessonId: string;
  title: string | null;
  opens: number;
  readers: number;
  completes: number;
};

/** Most active first: finished lessons weigh more than opens; ties go to the latest activity. */
export function rankCodes(rows: CodeActivityRow[]) {
  const score = (row: CodeActivityRow) => row.completes * 3 + row.opens;
  return [...rows].sort(
    (a, b) => score(b) - score(a) || String(b.lastAt || "").localeCompare(String(a.lastAt || "")) || a.code.localeCompare(b.code),
  );
}

/** Most read first: distinct readers, then opens, then completions. */
export function rankLessons(rows: LessonActivityRow[]) {
  return [...rows].sort((a, b) => b.readers - a.readers || b.opens - a.opens || b.completes - a.completes || a.lessonId.localeCompare(b.lessonId));
}

/** A code shown to the owner: the note first (usually the apprentice's name), else the code itself. */
export function codeLabel(row: Pick<CodeActivityRow, "code" | "note">) {
  return row.note.trim() || row.code;
}
