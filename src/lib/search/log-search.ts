/** Search observability. Never logs the raw query or PII. */
export type SearchLog = {
  mode: "classic" | "parsed" | "fallback";
  zero: boolean;
  count: number;
  categoryId?: number;
  city?: boolean;
  openNow?: boolean;
  nearMe?: boolean;
  remainder?: boolean;
};

export function logSearch(event: SearchLog) {
  console.log(
    JSON.stringify({
      level: "info",
      src: "search",
      t: new Date().toISOString(),
      mode: event.mode,
      zero: event.zero,
      count: event.count,
      category: Boolean(event.categoryId),
      city: Boolean(event.city),
      openNow: Boolean(event.openNow),
      nearMe: Boolean(event.nearMe),
      remainder: Boolean(event.remainder),
    }),
  );
}
