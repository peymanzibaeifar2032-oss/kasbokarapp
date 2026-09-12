import { normalizeFa, tokenizeFa } from "./normalize.ts";

/** Occupation synonyms. Expand the query — never dump a whole category. */
export const SYNONYM_GROUPS: string[][] = [
  ["پزشک", "دکتر"],
  ["تاتو", "تتو", "tattoo"],
  ["وکیل", "وکالت"],
  ["مکانیک", "تعمیرکار خودرو", "تعمیر خودرو"],
  ["کافه", "کافی شاپ", "کافی‌شاپ"],
  ["آرایشگاه زنانه", "آرایشگاه"],
];

const STRONG = 100;
const JOB = 80;
const SERVICE = 70;
const CATEGORY_TOKEN = 20;
const DESC = 5;
/** Category/description alone cannot keep a hit. */
export const MIN_KEEP_SCORE = SERVICE;

export type SearchableListing = {
  name: string;
  jobTitle?: string | null;
  categoryName?: string;
  description?: string | null;
  prices?: { title: string }[];
};

export type MatchTrace = {
  score: number;
  terms: string[];
  name: boolean;
  jobTitle: boolean;
  service: boolean;
  category: boolean;
  description: boolean;
  kept: boolean;
};

function fold(raw: string): string {
  return normalizeFa(raw).toLowerCase();
}

export function expandSearchTerms(raw: string | undefined | null): string[] {
  const original = fold(raw ?? "");
  if (!original) return [];
  const tokens = tokenizeFa(original).map((t) => t.toLowerCase());
  const seed = new Set<string>([original, ...tokens].filter((t) => t.length >= 2));
  const out = new Set<string>(seed);
  for (const group of SYNONYM_GROUPS) {
    const folded = group.map((g) => fold(g)).filter((g) => g.length >= 2);
    if ([...seed].some((s) => folded.includes(s))) {
      for (const g of folded) out.add(g);
    }
  }
  return [...out];
}

function haystackHas(hay: string, term: string): boolean {
  const h = fold(hay);
  const t = fold(term);
  return Boolean(h && t && t.length >= 2 && h.includes(t));
}

function categoryTokenHit(categoryName: string, terms: string[]): boolean {
  const tokens = tokenizeFa(categoryName).map((t) => t.toLowerCase());
  return terms.some((term) => tokens.includes(fold(term)));
}

function descriptionHit(description: string, terms: string[]): boolean {
  const tokens = new Set(tokenizeFa(description).map((t) => t.toLowerCase()));
  return terms.some((term) => tokens.has(fold(term)));
}

export function traceMatch(row: SearchableListing, rawQuery: string): MatchTrace {
  const terms = expandSearchTerms(rawQuery);
  const empty = {
    score: 0,
    terms,
    name: false,
    jobTitle: false,
    service: false,
    category: false,
    description: false,
    kept: false,
  };
  if (!terms.length) return empty;
  const name = terms.some((t) => haystackHas(row.name, t));
  const jobHay = row.jobTitle;
  const job = Boolean(jobHay && terms.some((t) => haystackHas(jobHay, t)));
  const service = (row.prices ?? []).some((p) => terms.some((t) => haystackHas(p.title, t)));
  const category = Boolean(row.categoryName && categoryTokenHit(row.categoryName, terms));
  const description = Boolean(row.description && descriptionHit(row.description, terms));
  let score = 0;
  if (name) score = Math.max(score, STRONG);
  if (job) score = Math.max(score, JOB);
  if (service) score = Math.max(score, SERVICE);
  if (category) score = Math.max(score, CATEGORY_TOKEN);
  if (description) score = Math.max(score, DESC);
  return {
    score,
    terms,
    name,
    jobTitle: job,
    service,
    category,
    description,
    kept: name || job || service,
  };
}

export function scoreListing(row: SearchableListing, rawQuery: string): number {
  const tr = traceMatch(row, rawQuery);
  return tr.kept ? tr.score : 0;
}

export function isSearchQuery(raw: string | undefined | null): boolean {
  return fold(raw ?? "").length > 0;
}

/** Non-empty query: keep only listings with a strong name/job/service match. */
export function filterRelevant<T extends SearchableListing>(rows: T[], rawQuery: string): T[] {
  if (!isSearchQuery(rawQuery)) return rows;
  const scored = rows
    .map((row) => ({ row, tr: traceMatch(row, rawQuery) }))
    .filter((x) => x.tr.kept);
  scored.sort((a, b) => b.tr.score - a.tr.score);
  return scored.map((x) => x.row);
}
