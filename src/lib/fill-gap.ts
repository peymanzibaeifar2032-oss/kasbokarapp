export const BODY_CAP_MINUTES = 8 * 60;

export type GapCandidate = {
  id: string;
  name: string;
  phone: string;
  phone2?: string;
  minutes: number;
  createdAt: string;
  missedCount?: number;
  ongoing?: boolean;
  source?: "piece" | "history";
};

export function phoneTail(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

export function pieceMinutes(saved: number, history: number) {
  if (saved >= 30) return { minutes: saved, source: "piece" as const };
  if (history >= 30) return { minutes: history, source: "history" as const };
  return { minutes: 0, source: "none" as const };
}

export function suggestWaitlist(remaining: number, candidates: GapCandidate[], busyPhones: Set<string>, now = Date.now()) {
  const open = candidates.filter((row) => {
    if (row.minutes < 30 || row.minutes > remaining) return false;
    const tails = [phoneTail(row.phone), phoneTail(row.phone2 || "")].filter(Boolean);
    return tails.every((tail) => !busyPhones.has(tail));
  });
  const ranked = [...open].sort((a, b) => gapScore(b, remaining, now) - gapScore(a, remaining, now) || a.createdAt.localeCompare(b.createdAt));
  const primary = ranked[0] ?? null;
  const alternate = ranked[1] ?? null;
  const bothFit = Boolean(primary && alternate && primary.minutes + alternate.minutes <= remaining);
  return { primary, alternate, bothFit };
}

function gapScore(row: GapCandidate, remaining: number, now: number) {
  const fit = remaining > 0 ? row.minutes / remaining : 0;
  const waitedDays = Math.max(0, (now - (Date.parse(row.createdAt) || now)) / 86_400_000);
  const waitBoost = Math.min(waitedDays, 45) * 0.03;
  const miss = Math.min(row.missedCount || 0, 5) * 0.15;
  return fit + waitBoost - miss;
}
