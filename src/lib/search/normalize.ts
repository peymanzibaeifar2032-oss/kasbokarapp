import { toEnDigits } from "../format.ts";

/** Arabic/Persian letter and punctuation fold. Does not drop ZWNJ. */
function foldLetters(raw: string): string {
  return toEnDigits(raw)
    .replace(/[يىؽؾؿ]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ی")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "");
}

function collapseSpaces(raw: string): string {
  return raw
    .replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

/** Deterministic Persian text fold. Does not delete the original query. */
export function normalizeFa(raw: string): string {
  return collapseSpaces(
    foldLetters(raw).replace(/[\u200c\u200d\u200e\u200f\u202a-\u202e]/g, " "),
  );
}

/** Fold digits and Arabic letters but keep ZWNJ so names like ماه‌رخ still match. */
export function foldFaKeepJoiner(raw: string): string {
  return collapseSpaces(foldLetters(raw));
}

export function tokenizeFa(raw: string): string[] {
  const n = normalizeFa(raw).replace(/[؟?!,.،؛:()«»"'٪%]/g, " ");
  if (!n.trim()) return [];
  return n.split(/\s+/).filter(Boolean);
}
