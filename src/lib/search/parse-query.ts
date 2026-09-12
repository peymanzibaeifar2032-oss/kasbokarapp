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
  /** Real calendar availability for today — never implied by openNow or a dateless «وقت خالی». */
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
const NEAR_TERMS = ["نزدیک من", "نزدیکم", "اطراف من", "نزدیک"];

/** Explicit today cue required before we set freeToday. Patterns run on normalizeFa text. */
const TODAY_AVAIL_RE =
  /(?:که\s+)?(?:نوبت\s+امروز|امروز\s+(?:وقت(?:\s+(?:خالی|ازاد))?|نوبت)(?:\s+(?:دارد|داره))?)/g;
/** Strip from WHAT; does not invent a date filter. */
const GENERIC_AVAIL_RE = /(?:که\s+)?(?:وقت\s+(?:خالی|ازاد)|نوبت)(?:\s+(?:دارد|داره))?/g;

const STOP = new Set(["در", "که", "با", "از", "برای", "را", "به", "یک", "این", "اون", "من", "امروز", "الان", "است", "و", "هم"]);
const WHEN_DEBRIS = new Set(["وقت", "خالی", "آزاد", "ازاد", "نوبت", "دارد", "داره", "باز", "بازه", "باشه", "الان", "امروز"]);
const WHERE_DEBRIS = new Set(["نزدیک", "نزدیکم", "اطراف"]);
const INTENT_DEBRIS = new Set([...WHEN_DEBRIS, ...WHERE_DEBRIS]);

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

function peelRegex(work: string, re: RegExp): { hit: boolean; rest: string } {
  const n = normalizeFa(work);
  const copy = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  if (!copy.test(n)) return { hit: false, rest: work };
  const rest = normalizeFa(n.replace(new RegExp(re.source, "g"), " "));
  return { hit: rest !== n, rest };
}

function contentTokens(raw: string): string[] {
  return tokenizeFa(raw).filter((tok) => !STOP.has(tok) && !INTENT_DEBRIS.has(tok));
}

/** Leftover function words from چی/کجا/کی — never a business-name remainder. */
export function isIntentDebrisText(raw: string | undefined | null): boolean {
  const tokens = tokenizeFa(raw ?? "").filter((tok) => !STOP.has(tok));
  return tokens.length > 0 && tokens.every((tok) => INTENT_DEBRIS.has(tok));
}

/** True when leftover text is only a time/availability phrase. */
export function hasWhenResidue(raw: string | undefined | null): boolean {
  const n = normalizeFa(raw ?? "");
  if (!n) return false;
  if (isIntentDebrisText(n)) return true;
  const hadWhen = tokenizeFa(n).some((tok) => WHEN_DEBRIS.has(tok));
  return hadWhen && contentTokens(n).length === 0;
}

/** @deprecated use isIntentDebrisText */
export function isAvailDebrisText(raw: string | undefined | null): boolean {
  return isIntentDebrisText(raw);
}

function eatOpenNear(work: string): { openNow: boolean; nearMe: boolean; rest: string } {
  let rest = work;
  let openNow = false;
  let nearMe = false;
  const open = eatLongest(rest, OPEN_TERMS);
  if (open.hit) {
    openNow = true;
    rest = open.rest;
  }
  const near = eatLongest(rest, NEAR_TERMS);
  if (near.hit) {
    nearMe = true;
    rest = near.rest;
  }
  return { openNow, nearMe, rest };
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

  // WHEN first — never leave time phrases in the residual WHAT text.
  const todayFirst = peelRegex(work, TODAY_AVAIL_RE);
  if (todayFirst.hit) {
    freeToday = true;
    work = todayFirst.rest;
  }
  const genericFirst = peelRegex(work, GENERIC_AVAIL_RE);
  if (genericFirst.hit) work = genericFirst.rest;

  const firstOpenNear = eatOpenNear(work);
  openNow = firstOpenNear.openNow;
  nearMe = firstOpenNear.nearMe;
  work = firstOpenNear.rest;

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

  // Second pass: leftover «که امروز وقت خالی دارد» after place/category.
  const todayLast = peelRegex(work, TODAY_AVAIL_RE);
  if (todayLast.hit) {
    freeToday = true;
    work = todayLast.rest;
  }
  const genericLast = peelRegex(work, GENERIC_AVAIL_RE);
  if (genericLast.hit) work = genericLast.rest;
  const lastOpenNear = eatOpenNear(work);
  if (lastOpenNear.openNow) openNow = true;
  if (lastOpenNear.nearMe) nearMe = true;
  work = lastOpenNear.rest;

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
