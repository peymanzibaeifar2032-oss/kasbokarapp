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

export function expandSearchTerms(raw: string | undefined | null): string[] {
  const original = normalizeFa(raw ?? "");
  if (!original) return [];
  const tokens = tokenizeFa(original);
  const seed = new Set<string>([original, ...tokens].filter((t) => t.length >= 2));
  const out = new Set<string>(seed);
  for (const group of SYNONYM_GROUPS) {
    const folded = group.map((g) => normalizeFa(g));
    const hit = [...seed].some((s) => folded.some((g) => g === s || s === g));
    if (hit) for (const g of folded) if (g.length >= 2) out.add(g);
  }
  return [...out];
}

function haystackHas(hay: string, term: string): boolean {
  const h = normalizeFa(hay);
  const t = normalizeFa(term);
  return Boolean(h && t && t.length >= 2 && h.includes(t));
}

function categoryTokenHit(categoryName: string, terms: string[]): boolean {
  const tokens = tokenizeFa(categoryName);
  return terms.some((term) => tokens.includes(normalizeFa(term)));
}

function descriptionHit(description: string, terms: string[]): boolean {
  const tokens = new Set(tokenizeFa(description));
  return terms.some((term) => tokens.has(normalizeFa(term)));
}

export function scoreListing(row: SearchableListing, rawQuery: string): number {
  const terms = expandSearchTerms(rawQuery);
  if (!terms.length) return 0;
  let best = 0;
  if (terms.some((t) => haystackHas(row.name, t))) best = Math.max(best, STRONG);
  const job = row.jobTitle;
  if (job && terms.some((t) => haystackHas(job, t))) best = Math.max(best, JOB);
  const services = row.prices ?? [];
  if (services.some((p) => terms.some((t) => haystackHas(p.title, t)))) best = Math.max(best, SERVICE);
  if (row.categoryName && categoryTokenHit(row.categoryName, terms)) best = Math.max(best, CATEGORY_TOKEN);
  const desc = row.description;
  if (desc && descriptionHit(desc, terms)) best = Math.max(best, DESC);
  return best;
}

export function isSearchQuery(raw: string | undefined | null): boolean {
  return normalizeFa(raw ?? "").length > 0;
}

/** Non-empty query: keep only listings with a strong name/job/service match. */
export function filterRelevant<T extends SearchableListing>(rows: T[], rawQuery: string): T[] {
  if (!isSearchQuery(rawQuery)) return rows;
  const scored = rows
    .map((row) => ({ row, score: scoreListing(row, rawQuery) }))
    .filter((x) => x.score >= MIN_KEEP_SCORE);
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.row);
}
