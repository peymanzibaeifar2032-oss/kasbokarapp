import { PROVINCES } from "../data/catalog.ts";
import { normalizeFa, tokenizeFa } from "./normalize.ts";

export type ParsedQuery = {
  original: string;
  normalized: string;
  remainder: string;
  categoryId?: number;
  /** Alias that matched, e.g. تاتو — used for the چی chip. */
  categoryTerm?: string;
  city?: string;
  province?: string;
  openNow: boolean;
  /** Real calendar availability for today — never implied by openNow. */
  freeToday: boolean;
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
/** Requires an explicit today cue. Must be eaten before generic availability. */
const AVAIL_TODAY_TERMS = [
  "امروز وقت خالی دارد",
  "امروز وقت خالی داره",
  "امروز وقت آزاد دارد",
  "امروز وقت آزاد داره",
  "امروز نوبت دارد",
  "امروز نوبت داره",
  "امروز وقت خالی",
  "امروز وقت آزاد",
  "نوبت امروز",
  "امروز نوبت",
];
/** Strip from WHAT; do not invent a today/date filter. */
const AVAIL_GENERIC_TERMS = [
  "وقت خالی دارد",
  "وقت خالی داره",
  "وقت آزاد دارد",
  "وقت آزاد داره",
  "وقت خالی",
  "وقت آزاد",
];
const NEAR_TERMS = ["نزدیک من", "نزدیکم", "اطراف من", "نزدیک"];
const STOP = new Set([
  "در",
  "که",
  "با",
  "از",
  "برای",
  "را",
  "به",
  "یک",
  "این",
  "اون",
  "من",
  "امروز",
  "الان",
  "است",
  "و",
  "هم",
]);
const INTENT_DEBRIS = new Set([
  "وقت",
  "خالی",
  "آزاد",
  "نوبت",
  "دارد",
  "داره",
  "باز",
  "بازه",
  "باشه",
  "نزدیک",
  "نزدیکم",
  "اطراف",
  "الان",
  "امروز",
]);

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
  for (const { n, p } of scored) {
    const idx = indexOfSeq(tokens, n);
    if (idx >= 0) {
      const rest = [...tokens.slice(0, idx), ...tokens.slice(idx + n.length)].join(" ");
      return { hit: p, rest: normalizeFa(rest) };
    }
  }
  return { hit: null, rest: haystack };
}

function contentTokens(raw: string): string[] {
  return tokenizeFa(raw).filter((tok) => !STOP.has(tok) && !INTENT_DEBRIS.has(tok));
}

/** Leftover function words from چی/کجا/کی — never a business-name remainder. */
export function isIntentDebrisText(raw: string | undefined | null): boolean {
  const tokens = tokenizeFa(raw ?? "").filter((tok) => !STOP.has(tok));
  return tokens.length > 0 && tokens.every((tok) => INTENT_DEBRIS.has(tok));
}

/** @deprecated use isIntentDebrisText */
export function isAvailDebrisText(raw: string | undefined | null): boolean {
  return isIntentDebrisText(raw);
}

function eatTodayAvailability(work: string): { hit: boolean; rest: string } {
  const eaten = eatLongest(work, AVAIL_TODAY_TERMS);
  if (eaten.hit) return { hit: true, rest: eaten.rest };
  const tokens = tokenizeFa(work);
  const hasToday = tokens.includes("امروز");
  const hasAvail = tokens.some((tok) => ["وقت", "خالی", "آزاد", "نوبت"].includes(tok));
  if (hasToday && hasAvail) {
    const rest = tokens.filter((tok) => tok !== "امروز" && !INTENT_DEBRIS.has(tok)).join(" ");
    return { hit: true, rest: normalizeFa(rest) };
  }
  return { hit: false, rest: work };
}

export function parseSearchQuery(raw: string | undefined | null): ParsedQuery {
  const original = (raw ?? "").trim();
  if (!original) {
    return {
      original,
      normalized: "",
      remainder: "",
      openNow: false,
      freeToday: false,
      nearMe: false,
      confidence: "low",
      mode: "classic",
    };
  }
  let work = normalizeFa(original);
  let categoryId: number | undefined;
  let categoryTerm: string | undefined;
  let city: string | undefined;
  let province: string | undefined;
  let openNow = false;
  let freeToday = false;
  let nearMe = false;

  const todayFirst = eatTodayAvailability(work);
  if (todayFirst.hit) {
    freeToday = true;
    work = todayFirst.rest;
  }
  const genericAvail = eatLongest(work, AVAIL_GENERIC_TERMS);
  if (genericAvail.hit) work = genericAvail.rest;

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
      categoryTerm = c.term;
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

  const todayLast = eatTodayAvailability(work);
  if (todayLast.hit) {
    freeToday = true;
    work = todayLast.rest;
  }
  const genericLast = eatLongest(work, AVAIL_GENERIC_TERMS);
  if (genericLast.hit) work = genericLast.rest;
  const openLast = eatLongest(work, OPEN_TERMS);
  if (openLast.hit) {
    openNow = true;
    work = openLast.rest;
  }
  const nearLast = eatLongest(work, NEAR_TERMS);
  if (nearLast.hit) {
    nearMe = true;
    work = nearLast.rest;
  }

  const remainder = contentTokens(work).join(" ");

  const structured = Boolean(categoryId || city);
  const extras = openNow || nearMe || freeToday;
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
    categoryTerm,
    city,
    province,
    openNow,
    freeToday,
    nearMe,
    confidence,
    mode,
  };
}
