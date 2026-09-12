import { PROVINCES } from "../data/catalog.ts";
import { normalizeFa, tokenizeFa } from "./normalize.ts";

export type ParsedQuery = {
  original: string;
  normalized: string;
  remainder: string;
  categoryId?: number;
  city?: string;
  province?: string;
  openNow: boolean;
  nearMe: boolean;
  confidence: "high" | "medium" | "low";
  mode: "parsed" | "fallback" | "classic";
};

const CATEGORY_ALIASES: { id: number; terms: string[] }[] = [
  { id: 1, terms: ["آرایشگاه زنانه", "آرایشگاه", "آرایش", "زیبایی", "تاتو", "سالن زیبایی", "سالن"] },
  { id: 2, terms: ["پزشک", "کلینیک", "سلامت", "دندان", "درمانگاه"] },
  { id: 3, terms: ["طراحی سایت", "نرم‌افزار", "برنامه", "فناوری"] },
  { id: 4, terms: ["تعمیرگاه", "مکانیک", "خودرو", "ماشین"] },
  { id: 5, terms: ["فروشگاه", "خرید"] },
  { id: 6, terms: ["نظافت", "خانه", "تاسیسات"] },
  { id: 7, terms: ["رستوران", "غذا", "کباب"] },
  { id: 8, terms: ["کافه", "قهوه", "شیرینی"] },
  { id: 9, terms: ["آموزش", "کلاس", "معلم"] },
  { id: 10, terms: ["باشگاه", "ورزش", "تناسب"] },
  { id: 11, terms: ["املاک", "مسکن"] },
  { id: 12, terms: ["وکیل", "حقوقی", "مالی"] },
];

const OPEN_TERMS = ["الان بازه", "الان باز", "امروز باز", "باز است", "باز باشه", "باز باشه؟", "باز"];
const NEAR_TERMS = ["نزدیک من", "نزدیکم", "اطراف من", "نزدیک"];
const STOP = new Set(["در", "که", "با", "از", "برای", "را", "به", "یک", "این", "اون", "من", "امروز", "الان", "است"]);

function indexOfSeq(hay: string[], needle: string[]): number {
  if (!needle.length) return -1;
  for (let i = 0; i <= hay.length - needle.length; i++) {
    if (needle.every((t, j) => hay[i + j] === t)) return i;
  }
  return -1;
}

/** Token-boundary phrase eat. "باز" must not match inside "بازار". */
function eatLongest(haystack: string, phrases: string[]): { hit: string | null; rest: string } {
  const tokens = tokenizeFa(haystack);
  const scored = phrases
    .map((p) => ({ p, n: tokenizeFa(p) }))
    .filter((x) => x.n.length > 0)
    .sort((a, b) => b.n.length - a.n.length || b.p.length - a.p.length);
  for (const { n } of scored) {
    const idx = indexOfSeq(tokens, n);
    if (idx >= 0) {
      const rest = [...tokens.slice(0, idx), ...tokens.slice(idx + n.length)].join(" ");
      return { hit: n.join(" "), rest: normalizeFa(rest) };
    }
  }
  return { hit: null, rest: haystack };
}

export function parseSearchQuery(raw: string | undefined | null): ParsedQuery {
  const original = (raw ?? "").trim();
  if (!original) {
    return {
      original,
      normalized: "",
      remainder: "",
      openNow: false,
      nearMe: false,
      confidence: "low",
      mode: "classic",
    };
  }
  let work = normalizeFa(original);
  let categoryId: number | undefined;
  let city: string | undefined;
  let province: string | undefined;
  let openNow = false;
  let nearMe = false;

  const open = eatLongest(work, OPEN_TERMS);
  if (open.hit) {
    openNow = true;
    work = open.rest;
  }
  const near = eatLongest(work, NEAR_TERMS);
  if (near.hit) {
    nearMe = true;
    work = near.rest;
  }

  const catPhrases = CATEGORY_ALIASES.flatMap((c) => c.terms.map((term) => ({ id: c.id, term })));
  catPhrases.sort((a, b) => tokenizeFa(b.term).length - tokenizeFa(a.term).length || b.term.length - a.term.length);
  for (const c of catPhrases) {
    const eaten = eatLongest(work, [c.term]);
    if (eaten.hit) {
      categoryId = c.id;
      work = eaten.rest;
      break;
    }
  }

  const places: { city: string; province: string }[] = [];
  for (const p of PROVINCES) {
    places.push({ city: p.name, province: p.name });
    for (const c of p.cities) places.push({ city: c, province: p.name });
  }
  places.sort((a, b) => tokenizeFa(b.city).join("").length - tokenizeFa(a.city).join("").length);
  for (const p of places) {
    const eaten = eatLongest(work, [p.city]);
    if (eaten.hit) {
      city = p.city;
      province = p.province;
      work = eaten.rest;
      break;
    }
  }

  const remainder = tokenizeFa(work)
    .filter((tok) => !STOP.has(tok))
    .join(" ");

  const structured = Boolean(categoryId || city);
  const extras = openNow || nearMe;
  let confidence: ParsedQuery["confidence"] = "low";
  let mode: ParsedQuery["mode"] = "fallback";
  if (structured) {
    confidence = "high";
    mode = "parsed";
  } else if (extras) {
    confidence = "medium";
    mode = "parsed";
  } else {
    mode = "fallback";
  }

  return {
    original,
    normalized: normalizeFa(original),
    remainder,
    categoryId,
    city,
    province,
    openNow,
    nearMe,
    confidence,
    mode,
  };
}
