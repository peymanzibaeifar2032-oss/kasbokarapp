export const BODY_CAP_MINUTES = 8 * 60;

export type GapCandidate = {
  id: string;
  name: string;
  phone: string;
  minutes: number;
  createdAt: string;
};

export function phoneTail(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

export function suggestWaitlist(remaining: number, candidates: GapCandidate[], busyPhones: Set<string>) {
  const open = candidates
    .filter((row) => row.minutes >= 30 && row.minutes <= remaining)
    .filter((row) => {
      const tail = phoneTail(row.phone);
      return !tail || !busyPhones.has(tail);
    })
    .sort((a, b) => b.minutes - a.minutes || a.createdAt.localeCompare(b.createdAt));
  const primary = open[0] ?? null;
  const alternate = open.find((row) => row !== primary) ?? null;
  const bothFit = Boolean(primary && alternate && primary.minutes + alternate.minutes <= remaining);
  return { primary, alternate, bothFit };
}
