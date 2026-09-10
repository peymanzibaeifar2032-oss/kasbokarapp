import { GUIDE_CHUNKS, type GuideAudience, type GuideChunk } from "./knowledge.ts";

function normalize(s: string) {
  return s
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[‌\s]+/g, " ")
    .trim()
    .toLowerCase();
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 || /^\d+$/.test(w));
}

export function retrieveChunks(query: string, audience: GuideAudience, limit = 5): GuideChunk[] {
  const qTokens = tokens(query);
  if (!qTokens.length) {
    return GUIDE_CHUNKS.filter((c) => c.audience.includes("all") || c.audience.includes(audience)).slice(0, limit);
  }
  const scored = GUIDE_CHUNKS.map((chunk) => {
    if (!(chunk.audience.includes("all") || chunk.audience.includes(audience))) {
      return { chunk, score: 0 };
    }
    const hay = normalize(`${chunk.title} ${chunk.tags.join(" ")} ${chunk.body}`);
    let score = 0;
    for (const t of qTokens) {
      if (hay.includes(t)) score += t.length >= 4 ? 3 : 2;
    }
    for (const tag of chunk.tags) {
      if (normalize(query).includes(normalize(tag))) score += 4;
    }
    return { chunk, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, limit).map((x) => x.chunk);
  const nq = normalize(query);
  if (/رایگان|آزمایشی|اشتراک|۳۰ روز|30 روز/.test(nq) && !picked.some((c) => c.id === "trial-plan")) {
    const extra = GUIDE_CHUNKS.find((c) => c.id === "trial-plan");
    if (extra) picked.unshift(extra);
  }
  if (!picked.length) {
    return GUIDE_CHUNKS.filter((c) => c.id === "what" || c.id === "limits" || c.id === "guide-bugs");
  }
  return picked.slice(0, limit);
}

export function formatChunks(chunks: GuideChunk[]): string {
  return chunks.map((c) => `### ${c.title}\n${c.body}`).join("\n\n");
}
