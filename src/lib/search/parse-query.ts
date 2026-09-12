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
const STOP = new Set(["در", "که", "با", "از", "برای", "را", "به", "یک", "این", "اون", "من", "امروز", "الان"]);

function eatLongest(haystack: string, phrases: string[]): { hit: string | null; rest: string } {
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    const n = normalizeFa(p);
    const idx = haystack.indexOf(n);
    if (idx >= 0) {
      const rest = normalizeFa(`${haystack.slice(0, idx)} ${haystack.slice(idx + n.length)}`);
      return { hit: n, rest };
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
  catPhrases.sort((a, b) => b.term.length - a.term.length);
  for (const c of catPhrases) {
    const n = normalizeFa(c.term);
    const idx = work.indexOf(n);
    if (idx >= 0) {
      categoryId = c.id;
      work = normalizeFa(`${work.slice(0, idx)} ${work.slice(idx + n.length)}`);
      break;
    }
  }

  const places: { city: string; province: string }[] = [];
  for (const p of PROVINCES) {
    places.push({ city: p.name, province: p.name });
    for (const c of p.cities) places.push({ city: c, province: p.name });
  }
  places.sort((a, b) => b.city.length - a.city.length);
  for (const p of places) {
    const n = normalizeFa(p.city);
    const idx = work.indexOf(n);
    if (idx >= 0) {
      city = p.city;
      province = p.province;
      work = normalizeFa(`${work.slice(0, idx)} ${work.slice(idx + n.length)}`);
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
