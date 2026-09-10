const WINDOW_MS = 10 * 60 * 1000;
export const GUIDE_RATE_LIMITS = {
  chat: 30,
  suspicious: 10,
  bug: 8,
} as const;

type Kind = keyof typeof GUIDE_RATE_LIMITS;
type Bucket = { count: number; resetAt: number };

const globalRef = globalThis as typeof globalThis & {
  __kasbGuideRate__?: Map<string, Bucket>;
};

function store() {
  globalRef.__kasbGuideRate__ ??= new Map();
  return globalRef.__kasbGuideRate__;
}

export function rateLimit(key: string, kind: Kind): { ok: true } | { ok: false; retryMin: number } {
  const max = GUIDE_RATE_LIMITS[kind];
  const now = Date.now();
  const map = store();
  const id = `${kind}:${key}`;
  const cur = map.get(id);
  if (!cur || cur.resetAt < now) {
    map.set(id, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (cur.count >= max) {
    return { ok: false, retryMin: Math.max(1, Math.ceil((cur.resetAt - now) / 60000)) };
  }
  cur.count += 1;
  return { ok: true };
}

export function clientKey(request: Request, userId?: string | null) {
  if (userId) return `u:${userId}`;
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || request.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}
