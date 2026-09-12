import { toEnDigits } from "../format.ts";

/** Deterministic Persian text fold. Does not delete the original query. */
export function normalizeFa(raw: string): string {
  return toEnDigits(raw)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d\u200e\u200f\u202a-\u202e]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

export function tokenizeFa(raw: string): string[] {
  const n = normalizeFa(raw);
  if (!n) return [];
  return n.split(" ").filter(Boolean);
}
